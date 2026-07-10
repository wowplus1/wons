// src/utils/catalogCache.ts
// 카탈로그 메타데이터 캐시를 IndexedDB에 저장한다.
// (5,120건 메타데이터가 ~3.3MB라 localStorage(~5MB 한도)에는 부적합 → IndexedDB 사용)
// 이미지는 이 캐시에 포함하지 않는다(imageStore 에서 별도 관리).
import type { CatalogItem } from '../firebase/mockDb';

const IDB_NAME = 'wons_erp_meta';
const IDB_STORE = 'kv';
const KEY = 'catalog';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
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
  return dbPromise;
}

/** 카탈로그 메타데이터 배열을 IndexedDB에 저장 (이미지 필드는 제거). */
export async function saveCatalogCache(catalog: CatalogItem[]): Promise<void> {
  const d = await openDb();
  if (!d) return;
  try {
    const slim = (catalog || []).map((c) => {
      const { images, ...rest } = c as any;
      const hasImg = c.has_image ?? (Array.isArray(images) && images.length > 0 && !!images[0]);
      return { ...rest, images: [], has_image: hasImg };
    });
    const tx = d.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(slim, KEY);
  } catch {
    /* ignore */
  }
}

/** IndexedDB에서 카탈로그 메타데이터 배열을 로드. 없으면 null. */
export async function loadCatalogCache(): Promise<CatalogItem[] | null> {
  const d = await openDb();
  if (!d) return null;
  return new Promise((resolve) => {
    try {
      const tx = d.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as CatalogItem[]) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
