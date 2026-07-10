// src/components/CatalogImage.tsx
// 카탈로그 상품 이미지 렌더러 (지연 로딩)
// 우선순위: 1) 문서에 내장된 이미지(embeddedImages, 마이그레이션 전 데이터) →
//           2) hasImage === false 면 즉시 '이미지 없음' →
//           3) 그 외에는 catalog_images 에서 지연 로딩(캐시됨)
import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { getCatalogImage } from '../utils/imageStore';

interface Props {
  model: string;
  embeddedImages?: string[];      // 하위호환: 아직 문서에 내장된 이미지가 있으면 그대로 사용
  hasImage?: boolean;             // 메타데이터상 이미지 존재 여부 (false면 조회 생략)
  alt?: string;
  imgStyle?: React.CSSProperties; // <img> 스타일
  className?: string;             // <img> 클래스
  fallback?: React.ReactNode;     // 이미지 없음/로딩 시 표시할 노드
}

export const CatalogImage: React.FC<Props> = ({
  model,
  embeddedImages,
  hasImage,
  alt,
  imgStyle,
  className,
  fallback,
}) => {
  const embedded = embeddedImages && embeddedImages[0];
  const [src, setSrc] = React.useState<string | null>(embedded || null);

  React.useEffect(() => {
    let alive = true;
    if (embedded) {
      setSrc(embedded);
      return;
    }
    if (hasImage === false) {
      setSrc(null);
      return;
    }
    // 지연 로딩
    getCatalogImage(model).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [model, embedded, hasImage]);

  if (src) {
    return <img src={src} alt={alt || model} className={className} style={imgStyle} />;
  }

  if (fallback !== undefined) return <>{fallback}</>;

  // 기본 플레이스홀더
  return (
    <div
      className="catalog-no-image"
      style={{
        width: '100%',
        height: '130px',
        background: 'rgba(15,23,42,0.03)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        borderBottom: '1px solid var(--border-color)',
        color: 'var(--text-muted)',
      }}
    >
      <ImageIcon size={28} />
      <span style={{ fontSize: '14px' }}>이미지 없음</span>
    </div>
  );
};
