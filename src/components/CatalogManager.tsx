// src/components/CatalogManager.tsx
import React from 'react';
import { useErpStore } from '../store/useErpStore';
import { Eye, Plus } from 'lucide-react';

export const CatalogManager: React.FC = () => {
  const { catalog, stones } = useErpStore();

  // Open Pop-up window for Catalog Registration
  const handleOpenRegisterWindow = () => {
    const isMobile = window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
    const w = isMobile ? window.innerWidth : 1020;
    const h = isMobile ? window.innerHeight : 820;
    const left = isMobile ? 0 : window.screen.width / 2 - w / 2;
    const top = isMobile ? 0 : window.screen.height / 2 - h / 2;
    
    window.open(
      '/?popup=catalog', 
      'catalog_register_popup', 
      isMobile 
        ? `width=${w},height=${h},top=0,left=0,resizable=yes,scrollbars=yes`
        : `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );
  };

  // Open Pop-up window for Catalog Item Details
  const handleOpenDetailWindow = (modelNumber: string) => {
    const isMobile = window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
    const w = isMobile ? window.innerWidth : 860;
    const h = isMobile ? window.innerHeight : 900;
    const left = isMobile ? 0 : window.screen.width / 2 - w / 2;
    const top = isMobile ? 0 : window.screen.height / 2 - h / 2;
    
    window.open(
      `/?popup=catalog_detail&model=${encodeURIComponent(modelNumber)}`, 
      `catalog_detail_popup_${modelNumber.replace(/[^a-zA-Z0-9가-힣]/g, '_')}`, 
      isMobile 
        ? `width=${w},height=${h},top=0,left=0,resizable=yes,scrollbars=yes`
        : `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Header bar with popup button */}
      <div className="catalog-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Eye size={18} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '16px', fontFamily: 'var(--font-title)', fontWeight: '600' }}>
            B2B 상품 카탈로그 마스터 조회
          </h2>
        </div>
        
        <button 
          onClick={handleOpenRegisterWindow} 
          className="btn-primary" 
          style={{ fontSize: '13px', padding: '6px 14px' }}
        >
          <Plus size={14} /> 신규 카다로그 등록 (새창)
        </button>
      </div>

      {/* Grid Card List (Full-width optimized layout) */}
      <div className="catalog-grid">
        {catalog.map(item => {
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
              <img 
                src={item.images[0]} 
                alt={item.model_number} 
                style={{ width: '100%', height: '130px', objectFit: 'cover', borderBottom: '1px solid var(--border-color)' }}
              />
              <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)', fontFamily: 'var(--font-title)' }}>
                    {item.model_number}
                  </span>
                  {item.is_set && (
                    <span className="badge badge-success" style={{ fontSize: '12px', padding: '2px 5px' }}>
                      SET 묶음
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  카테고리: <strong>{item.category}</strong>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  중량: <strong>{mainMaterial}[{pureGoldWeight.toFixed(2)}]</strong>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  스톤: <strong>{totalStonesWeight.toFixed(3)} g</strong>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  공임(14K 1등급): <strong>{(item.base_labor_fees['14K']?.grade_1 || 0).toLocaleString()}원</strong>
                </div>
                {item.default_stones && item.default_stones.length > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--primary)', marginTop: '4px', borderTop: '1px dashed var(--border-color)', paddingTop: '4px' }}>
                    매핑스톤: {item.default_stones.length}종 세팅됨
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
