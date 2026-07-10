import React, { useState, useEffect } from 'react';
import { useErpStore } from '../store/useErpStore';
import { X } from 'lucide-react';
import { CatalogImage } from './CatalogImage';

export const CatalogSelectPopup: React.FC = () => {
  const { catalog } = useErpStore();
  const [searchText, setSearchText] = useState('');

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

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredCatalog.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const displayedCatalog = filteredCatalog.slice(startIndex, startIndex + pageSize);

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
        <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--primary)' }}>
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
          style={{ flex: 1, padding: '6px 10px', fontSize: '15px' }}
          autoFocus
        />
      </div>

      {/* List */}
      <div
        style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}
      >
        {currentPage === 1 && (<>
        {/* 디자인출력 가상 선택 카드 (첫 페이지에만 노출) */}
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
            fontSize: '14px', 
            color: '#3b82f6', 
            fontWeight: '700' 
          }}>
            디자인
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', color: '#3b82f6', fontSize: '15px' }}>디자인출력 (3D 디자인 의뢰 모델)</span>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>가상모델</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>제조사: 자체</span>
              <span style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '15px' }}>
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
            background: 'rgba(37, 99, 235, 0.08)'
          }}
          className="stone-select-item"
        >
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '4px', 
            background: 'rgba(37, 99, 235, 0.15)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '14px', 
            color: 'var(--primary)', 
            fontWeight: '700' 
          }}>
            임시
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '15px' }}>임시제품 (수동 타건 모델)</span>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>가상모델</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>제조사: JP (기본값)</span>
              <span style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '15px' }}>
                공임/중량: 수동 기입
              </span>
            </div>
          </div>
        </div>
        </>)}

        {displayedCatalog.length > 0 ? (
          displayedCatalog.map(c => {
            const price = c.base_labor_fees['14K']?.[`grade_${targetGrade}`] || 0;
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
                  background: 'rgba(15, 23, 42, 0.01)'
                }}
                className="stone-select-item"
              >
                <CatalogImage
                  model={c.model_number}
                  embeddedImages={c.images}
                  hasImage={c.has_image}
                  alt={c.model_number}
                  imgStyle={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }}
                  fallback={
                    <div style={{ width: '40px', height: '40px', borderRadius: '4px', background: 'rgba(15,23,42,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                      No Img
                    </div>
                  }
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '15px' }}>{c.model_number}</span>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{c.category}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>제조사: {c.manufacturer || '자체'}</span>
                    <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '15px' }}>
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

      {/* Pagination (30개/페이지) */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', paddingTop: '4px' }}>
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="btn-primary"
            style={{ padding: '4px 10px', fontSize: '13px', background: currentPage === 1 ? 'rgba(15,23,42,0.04)' : undefined, color: currentPage === 1 ? 'var(--text-muted)' : undefined, border: currentPage === 1 ? '1px solid var(--border-color)' : 'none', boxShadow: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
          >
            이전
          </button>
          {(() => {
            const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
            const end = Math.min(totalPages, start + 4);
            const pages = [];
            for (let p = start; p <= end; p++) pages.push(p);
            return pages.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setCurrentPage(p)}
                className="btn-primary"
                style={{ padding: '4px 9px', fontSize: '13px', minWidth: '28px', background: p === currentPage ? undefined : 'rgba(15,23,42,0.04)', color: p === currentPage ? undefined : 'var(--text-muted)', border: p === currentPage ? 'none' : '1px solid var(--border-color)', boxShadow: 'none', fontWeight: p === currentPage ? '700' : '400' }}
              >
                {p}
              </button>
            ));
          })()}
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="btn-primary"
            style={{ padding: '4px 10px', fontSize: '13px', background: currentPage === totalPages ? 'rgba(15,23,42,0.04)' : undefined, color: currentPage === totalPages ? 'var(--text-muted)' : undefined, border: currentPage === totalPages ? '1px solid var(--border-color)' : 'none', boxShadow: 'none', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
          >
            다음
          </button>
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          전체 {filteredCatalog.length}개 · {currentPage}/{totalPages} 페이지
        </span>
        <button
          type="button"
          onClick={() => window.close()}
          className="btn-primary"
          style={{ padding: '5px 14px', background: 'rgba(15,23,42,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
        >
          닫기
        </button>
      </div>
    </div>
  );
};
