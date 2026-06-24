// src/components/CatalogSelectPopup.tsx
import React, { useState } from 'react';
import { useErpStore } from '../store/useErpStore';
import { X } from 'lucide-react';

export const CatalogSelectPopup: React.FC = () => {
  const { catalog } = useErpStore();
  const [searchText, setSearchText] = useState('');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Parse URL Parameters
  const queryParams = new URLSearchParams(window.location.search);
  const targetGrade = parseInt(queryParams.get('grade') || '1') || 1;
  const rowIndex = parseInt(queryParams.get('row') || '0') || 0;

  const handleSelectCatalogItem = (modelNumber: string) => {
    if (window.opener) {
      window.opener.postMessage({
        type: 'select_catalog',
        modelNumber,
        rowIndex
      }, '*');
      window.close();
    } else {
      alert('부모 창을 찾을 수 없습니다.');
    }
  };

  const filteredCatalog = catalog.filter(c => 
    c.model_number.toLowerCase().includes(searchText.toLowerCase()) ||
    c.category.toLowerCase().includes(searchText.toLowerCase()) ||
    (c.manufacturer && c.manufacturer.toLowerCase().includes(searchText.toLowerCase()))
  );

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: 'var(--bg-surface-solid)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px',
      gap: '12px',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }} className="glass-panel">
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)' }}>
          카달로그 모델 검색 및 선택
        </h3>
        <button 
          type="button" 
          onClick={() => window.close()}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={16} />
        </button>
      </div>
      
      {/* Search Bar */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="모델번호, 카테고리, 제조사 검색..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="input-field"
          style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
          autoFocus
        />
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
        {/* 디자인출력 가상 선택 카드 (상시 노출) */}
        <div 
          onClick={() => handleSelectCatalogItem('디자인출력')}
          style={{
            padding: '8px',
            border: '1px solid #3b82f6',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            transition: 'background 0.2s',
            background: 'rgba(59, 130, 246, 0.08)'
          }}
          className="stone-select-item"
        >
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '4px', 
            background: 'rgba(59, 130, 246, 0.15)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '11px', 
            color: '#3b82f6', 
            fontWeight: '700' 
          }}>
            디자인
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', color: '#3b82f6', fontSize: '12px' }}>디자인출력 (3D 디자인 의뢰 모델)</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>가상모델</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>제조사: 자체</span>
              <span style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '12px' }}>
                기본공임/기타설명만 기입
              </span>
            </div>
          </div>
        </div>

        {/* 임시제품 가상 선택 카드 (상시 노출) */}
        <div 
          onClick={() => handleSelectCatalogItem('임시제품')}
          style={{
            padding: '8px',
            border: '1px solid var(--primary)',
            borderRadius: '4px',
            cursor: 'pointer',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            transition: 'background 0.2s',
            background: 'rgba(212, 175, 55, 0.08)'
          }}
          className="stone-select-item"
        >
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '4px', 
            background: 'rgba(212, 175, 55, 0.15)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '11px', 
            color: 'var(--primary)', 
            fontWeight: '700' 
          }}>
            임시
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '12px' }}>임시제품 (수동 타건 모델)</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>가상모델</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>제조사: JP (기본값)</span>
              <span style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '12px' }}>
                공임/중량: 수동 기입
              </span>
            </div>
          </div>
        </div>

        {filteredCatalog.length > 0 ? (
          filteredCatalog.map(c => {
            const price = c.base_labor_fees['14K']?.[`grade_${targetGrade}`] || 0;
            const hasImageError = imageErrors[c.model_number];
            return (
              <div 
                key={c.model_number} 
                onClick={() => handleSelectCatalogItem(c.model_number)}
                style={{
                  padding: '8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  transition: 'background 0.2s',
                  background: 'rgba(255, 255, 255, 0.01)'
                }}
                className="stone-select-item"
              >
                {c.images && c.images[0] && !hasImageError ? (
                  <img 
                    src={c.images[0]} 
                    alt={c.model_number} 
                    style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} 
                    onError={() => setImageErrors(prev => ({ ...prev, [c.model_number]: true }))}
                  />
                ) : (
                  <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>
                    No Img
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '12px' }}>{c.model_number}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.category}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>제조사: {c.manufacturer || '자체'}</span>
                    <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '12px' }}>
                      공임: {price.toLocaleString()} 원
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
            검색 조건에 맞는 카달로그 항목이 존재하지 않습니다.
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
        <button 
          type="button" 
          onClick={() => window.close()} 
          className="btn-primary" 
          style={{ padding: '5px 14px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
        >
          닫기
        </button>
      </div>
    </div>
  );
};
