// src/utils/imageStore.ts
// 카탈로그 상품 이미지 지연 로딩 + 캐시 계층
// - 이미지는 별도 컬렉션 `catalog_images/{model}` 에 저장되고, 화면에 필요할 때만 조회된다.
// - 메모리 캐시 + IndexedDB 영속 캐시로 동일 이미지의 반복 Firestore 읽기를 제거한다.
//   (localStorage 는 5MB 한도라 수십 MB 이미지에는 부적합 → IndexedDB 사용)
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const mem = new Map<string, string>();               // model -> dataURL ('' = 이미지 없음)
const pending = new Map<string, Promise<string | null>>();

// ---------- IndexedDB (영속 캐시) ----------
const IDB_NAME = 'wons_catalog_images';
const IDB_STORE = 'images';
let idbPromise: Promise<IDBDatabase | null> | null = null;

function openIdb(): Promise<IDBDatabase | null> {
  if (idbPromise) return idbPromise;
  idbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(IDB_STORE)) d.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return idbPromise;
}

async function idbGet(model: string): Promise<string | null | undefined> {
  const d = await openIdb();
  if (!d) return undefined;
  return new Promise((resolve) => {
    try {
      const tx = d.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(model);
      req.onsuccess = () => resolve(req.result === undefined ? undefined : req.result);
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

async function idbSet(model: string, val: string): Promise<void> {
  const d = await openIdb();
  if (!d) return;
  try {
    const tx = d.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(val, model);
  } catch {
    /* ignore */
  }
}

// ---------- Public API ----------

/** 메모리/IDB 캐시에 이미지를 미리 넣어둔다 (예: 아직 문서에 내장된 이미지 재활용). */
export function primeCatalogImage(model: string, dataUrl?: string | null): void {
  if (!model) return;
  const v = dataUrl || '';
  if (v) {
    mem.set(model, v);
    void idbSet(model, v);
  }
}

/**
 * 모델의 대표 이미지를 반환한다. 없으면 null.
 * 캐시(memory→IDB)를 먼저 보고, 없을 때만 Firestore `catalog_images` 를 1회 읽는다.
 */
export async function getCatalogImage(model: string): Promise<string | null> {
  if (!model) return null;
  if (mem.has(model)) return mem.get(model) || null;
  if (pending.has(model)) return pending.get(model)!;

  const p = (async (): Promise<string | null> => {
    // 1) IndexedDB
    const cached = await idbGet(model);
    if (cached !== undefined) {
      mem.set(model, cached || '');
      return cached || null;
    }
    // 2) Firestore (catalog_images/{model})
    try {
      const snap = await getDoc(doc(db, 'catalog_images', model));
      const url = snap.exists() ? (((snap.data() as any).images || [])[0] || '') : '';
      mem.set(model, url);
      void idbSet(model, url); // '이미지 없음'도 캐시하여 재조회 방지
      return url || null;
    } catch {
      return null;
    }
  })();

  pending.set(model, p);
  try {
    return await p;
  } finally {
    pending.delete(model);
  }
}

/** 특정 모델의 캐시를 무효화한다 (이미지 수정/삭제 시). */
export function invalidateCatalogImage(model: string): void {
  mem.delete(model);
  void idbSet(model, '');
  mem.delete(model);
}
