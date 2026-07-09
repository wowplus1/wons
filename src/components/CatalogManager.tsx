// src/components/CatalogManager.tsx
import React from 'react';
import { useErpStore } from '../store/useErpStore';
import { Eye, Plus, Image } from 'lucide-react';

export const CatalogManager: React.FC = () => {
  const { catalog, stones } = useErpStore();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState('');
  const pageSize = 30;

  // 검색 필터 적용 (모델번호, 카테고리, 제조사, 총판, 비고, 재질, 매칭되는 스톤 명 등을 다각도 검색)
  const filteredCatalog = React.useMemo(() => {
    if (!searchTerm.trim()) return catalog;
    const term = searchTerm.trim().toLowerCase();
    
    return catalog.filter(item => {
      // 1. 모델번호
      if (item.model_number.toLowerCase().includes(term)) return true;
      
      // 2. 카테고리
      if (item.category && item.category.toLowerCase().includes(term)) return true;
      
      // 3. 제조사 / 제조사 코드
      if (item.manufacturer && item.manufacturer.toLowerCase().includes(term)) return true;
      if (item.manufacturer_code && item.manufacturer_code.toLowerCase().includes(term)) return true;
      
      // 4. 총판(도매처)
      if (item.vendor && item.vendor.toLowerCase().includes(term)) return true;
      
      // 5. 비고(메모)
      if (item.note && item.note.toLowerCase().includes(term)) return true;
      
      // 6. 재질 목록
      if (item.materials && item.materials.some(m => m.toLowerCase().includes(term))) return true;
      
      // 7. 기본 매핑 스톤 정보 (스톤 품명 또는 메모/스펙)
      if (item.default_stones && item.default_stones.length > 0) {
        const hasMatchingStone = item.default_stones.some(ds => {
          const stoneDetail = stones.find(s => s.stone_id === ds.stone_id);
          const stoneName = stoneDetail ? stoneDetail.name.toLowerCase() : ds.stone_id.toLowerCase();
          const stoneDesc = ds.description ? ds.description.toLowerCase() : '';
          return stoneName.includes(term) || stoneDesc.includes(term);
        });
        if (hasMatchingStone) return true;
      }
      
      return false;
    });
  }, [catalog, searchTerm, stones]);

  // 검색어 변경 시 첫 페이지로 이동
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredCatalog.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCatalog = filteredCatalog.slice(startIndex, startIndex + pageSize);

  // Open Pop-up window for Catalog Registration
  const handleOpenRegisterWindow = () => {
    const isMobile = window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
    const w = 1020;
    const h = 820;
    const left = window.screen.width / 2 - w / 2;
    const top = window.screen.height / 2 - h / 2;
    
    if (isMobile) {
      window.location.href = './?popup=catalog';
    } else {
      window.open(
        './?popup=catalog', 
        'catalog_register_popup', 
        `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes`
      );
    }
  };

  // Open Pop-up window for Catalog Item Details
  const handleOpenDetailWindow = (modelNumber: string) => {
    const isMobile = window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
    const w = 860;
    const h = 900;
    const left = window.screen.width / 2 - w / 2;
    const top = window.screen.height / 2 - h / 2;
    
    if (isMobile) {
      window.location.href = `./?popup=catalog_detail&model=${encodeURIComponent(modelNumber)}`;
    } else {
      window.open(
        `./?popup=catalog_detail&model=${encodeURIComponent(modelNumber)}`, 
        `catalog_detail_popup_${modelNumber.replace(/[^a-zA-Z0-9가-힣]/g, '_')}`, 
        `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes`
      );
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header bar with popup button */}
      <div className="catalog-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Eye size={18} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '19px', fontFamily: 'var(--font-title)', fontWeight: '600' }}>
            B2B 상품 카탈로그 마스터 조회
          </h2>
        </div>
        
        <button 
          onClick={handleOpenRegisterWindow} 
          className="btn-primary" 
          style={{ fontSize: '16px', padding: '6px 14px' }}
        >
          <Plus size={14} /> 신규 카다로그 등록 (새창)
        </button>
      </div>

      {/* Search Filter Bar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="모델번호, 카테고리, 제조사, 총판, 재질, 스톤명, 비고 등으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '14px',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            background: 'rgba(255, 255, 255, 0.02)',
            color: 'var(--text-main)',
            outline: 'none'
          }}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="btn-primary"
            style={{
              padding: '7px 14px',
              fontSize: '14px',
              background: '#e2e8f0',
              color: '#475569',
              border: '1.5px solid #94a3b8',
              boxShadow: 'none',
              cursor: 'pointer'
            }}
          >
            초기화
          </button>
        )}
      </div>

      {/* Grid Card List (Full-width optimized layout) */}
      <div className="catalog-grid">
        {paginatedCatalog.map(item => {
          const mainMaterial = item.materials[0] || '14K';
          const totalStonesWeight = item.default_stones.reduce((sum, ds) => {
            const matchedStone = stones.find(s => s.stone_id === ds.stone_id);
            return sum + ((matchedStone?.weight_carat || 0) * ds.quantity);
          }, 0);
          const manualDeductionWeight = item.manual_deduction_weight || 0;
          const totalDeductionWeight = totalStonesWeight + manualDeductionWeight;
          const pureGoldWeight = Math.max(0, (item.base_weight || 0) - totalDeductionWeight);

          return (
            <div 
              key={item.model_number}
              onClick={() => handleOpenDetailWindow(item.model_number)}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                overflow: 'hidden',
                background: 'rgba(255, 255, 255, 0.01)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'border-color 0.2s ease, transform 0.2s ease',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                cursor: 'pointer'
              }}
              className="catalog-card"
            >
              {item.images && item.images[0] ? (
                <img 
                  src={item.images[0]} 
                  alt={item.model_number} 
                  style={{ width: '100%', height: '130px', objectFit: 'cover', borderBottom: '1px solid var(--border-color)' }}
                />
              ) : (
                <div style={{ width: '100%', height: '130px', background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <Image size={28} />
                  <span style={{ fontSize: '14px' }}>이미지 없음</span>
                </div>
              )}
              <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '17px', fontWeight: '700', color: 'var(--primary)', fontFamily: 'var(--font-title)' }}>
                    {item.model_number}
                  </span>
                  {item.is_set && (
                    <span className="badge badge-success" style={{ fontSize: '13px', padding: '1px 4px' }}>
                      SET
                    </span>
                  )}
                </div>
                
                {(() => {
                  const materialLaborMap = (() => {
                    if (item.labor_fees_v2 && item.labor_fees_v2[mainMaterial]) {
                      const baseFee = item.labor_fees_v2[mainMaterial].find(f => f.type === '기본');
                      if (baseFee) {
                        return {
                          grade_1: Number(baseFee.grade_1) || 0,
                          color: baseFee.color || '전체'
                        };
                      }
                    }
                    return {
                      grade_1: item.base_labor_fees[mainMaterial]?.grade_1 ?? 60000,
                      color: 'G'
                    };
                  })();

                  const stoneQty = item.default_stones.reduce((sum, s) => sum + s.quantity, 0);
                  const grade1StoneLaborSum = item.default_stones.reduce((sum, ds) => {
                    const matchedStone = stones.find(s => s.stone_id === ds.stone_id);
                    if (!matchedStone) return sum;
                    const gradePrice = Number(matchedStone.grade_prices[`grade_1`]) || 0;
                    return sum + (gradePrice * ds.quantity);
                  }, 0);
                  const grade1StoneLaborTotal = grade1StoneLaborSum + (stoneQty * item.extra_labor_fee);

                  return (
                    <>
                      <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.4', marginTop: '10px' }}>
                        {materialLaborMap.color}, {mainMaterial}[{pureGoldWeight.toFixed(2)}]
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                        스톤: {totalDeductionWeight.toFixed(3)} g
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                        공임(1등): {materialLaborMap.grade_1.toLocaleString()}원
                      </div>
                      <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                        스톤(1등): {grade1StoneLaborTotal.toLocaleString()}원
                      </div>
                      {item.default_stones.length > 0 && (
                        <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '4px', paddingTop: '4px', fontSize: '13px', color: 'var(--primary)', opacity: '0.85', lineHeight: '1.4' }}>
                          {item.default_stones.map(ds => {
                            const matched = stones.find(s => s.stone_id === ds.stone_id);
                            const name = matched ? matched.name : ds.stone_id;
                            const desc = ds.description ? `/${ds.description}` : '';
                            return `[${ds.quantity}]${name}${desc}`;
                          }).join(', ')}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <button
            disabled={currentPage === 1}
            onClick={() => {
              setCurrentPage(prev => Math.max(1, prev - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="btn-primary"
            style={{
              padding: '5px 12px',
              fontSize: '13px',
              background: currentPage === 1 ? 'rgba(0,0,0,0.02)' : 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)',
              color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-inverse)',
              border: currentPage === 1 ? '1px solid var(--border-color)' : 'none',
              boxShadow: currentPage === 1 ? 'none' : '0 2px 6px rgba(170, 133, 19, 0.15)',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            이전
          </button>
          
          {(() => {
            const pageNumbers = [];
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + 4);
            if (endPage - startPage < 4) {
              startPage = Math.max(1, endPage - 4);
            }
            for (let i = startPage; i <= endPage; i++) {
              pageNumbers.push(i);
            }
            return pageNumbers.map(page => {
              const isActive = page === currentPage;
              return (
                <button
                  key={page}
                  onClick={() => {
                    setCurrentPage(page);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="btn-primary"
                  style={{
                    padding: '5px 12px',
                    fontSize: '13px',
                    minWidth: '32px',
                    background: isActive ? 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)' : 'transparent',
                    color: isActive ? 'var(--text-inverse)' : 'var(--text-muted)',
                    border: isActive ? 'none' : '1px solid var(--border-color)',
                    boxShadow: isActive ? '0 2px 6px rgba(170, 133, 19, 0.15)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  {page}
                </button>
              );
            });
          })()}

          <button
            disabled={currentPage === totalPages}
            onClick={() => {
              setCurrentPage(prev => Math.min(totalPages, prev + 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="btn-primary"
            style={{
              padding: '5px 12px',
              fontSize: '13px',
              background: currentPage === totalPages ? 'rgba(0,0,0,0.02)' : 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)',
              color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-inverse)',
              border: currentPage === totalPages ? '1px solid var(--border-color)' : 'none',
              boxShadow: currentPage === totalPages ? 'none' : '0 2px 6px rgba(170, 133, 19, 0.15)',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            다음
          </button>
        </div>
      )}

    </div>
  );
};
