// src/components/StoneManager.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useErpStore } from '../store/useErpStore';
import type { Stone } from '../firebase/mockDb';
import { Gem, RotateCcw, Plus } from 'lucide-react';

export const StoneManager: React.FC = () => {
  const { stones, catalog } = useErpStore();
  const [selectedStoneForUsedList, setSelectedStoneForUsedList] = useState<Stone | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  // 1. Filter & Search States (Matches screenshot header)
  const [filterName, setFilterName] = useState('');
  const [filterShape, setFilterShape] = useState('');
  const [searchCriteria, setSearchCriteria] = useState('stone_name');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortOrder, setSortOrder] = useState('no_asc');

  useEffect(() => {
    setCurrentPage(1);
  }, [filterName, filterShape, searchKeyword, searchCriteria, sortOrder]);

  // Handle Load/Select stone details (Mock load/action from Screenshot)
  const handleSelectStone = (stone: Stone) => {
    setSelectedStoneForUsedList(stone);
  };

  const usedCatalogItems = selectedStoneForUsedList
    ? catalog.filter(c => c.default_stones?.some(ds => ds.stone_id === selectedStoneForUsedList.stone_id))
    : [];

  // Open Pop-up window for Stone Registration
  const handleOpenRegisterWindow = () => {
    const isMobile = window.innerWidth < 768 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
    const w = 520;
    const h = 720;
    const left = window.screen.width / 2 - w / 2;
    const top = window.screen.height / 2 - h / 2;
    
    if (isMobile) {
      window.location.href = './?popup=stone';
    } else {
      window.open(
        './?popup=stone', 
        'stone_register_popup', 
        `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes`
      );
    }
  };

  // Filter and Sort Logic for Stone List
  const filteredStones = stones.filter(s => {
    if (filterName && !s.name.toUpperCase().startsWith(filterName.toUpperCase())) return false;
    if (filterShape && !s.name.toUpperCase().includes(`/${filterShape.toUpperCase()}/`)) return false;
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      if (searchCriteria === 'stone_name') {
        return s.name.toLowerCase().includes(kw);
      } else if (searchCriteria === 'note') {
        return s.name.toLowerCase().includes(kw); 
      }
    }
    return true;
  }).sort((a, b) => {
    if (sortOrder === 'no_asc') {
      const aNo = parseInt(a.stone_id.split('_')[0], 10) || 0;
      const bNo = parseInt(b.stone_id.split('_')[0], 10) || 0;
      return aNo - bNo;
    } else if (sortOrder === 'name_asc') {
      return a.name.localeCompare(b.name);
    } else if (sortOrder === 'name_desc') {
      return b.name.localeCompare(a.name);
    } else if (sortOrder === 'price_desc') {
      return b.grade_prices.grade_1 - a.grade_prices.grade_1;
    }
    return 0;
  });

  const totalPages = Math.ceil(filteredStones.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedStones = filteredStones.slice(startIndex, startIndex + pageSize);

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Top filter menu bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Gem size={18} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '19px', fontFamily: 'var(--font-title)', fontWeight: '600' }}>
            B2B 스톤 목록 및 시세 조회
          </h2>
        </div>
        
        {/* Open popup button */}
        <button 
          onClick={handleOpenRegisterWindow} 
          className="btn-primary" 
          style={{ fontSize: '16px', padding: '6px 14px' }}
        >
          <Plus size={14} /> 신규 스톤 등록 (새창)
        </button>
      </div>

      {/* Filter and Search query bar (Matches screenshot layout) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingBottom: '4px' }}>
        <select
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          className="input-field"
          style={{ fontSize: '15px', padding: '4px 8px', width: '110px' }}
        >
          <option value="">이름구분</option>
          <option value="CZ">CZ (큐빅)</option>
          <option value="DIA">DIA (다이아)</option>
          <option value="LAB">LAB (랩다이아)</option>
          <option value="RUBY">RUBY (루비)</option>
        </select>

        <select
          value={filterShape}
          onChange={(e) => setFilterShape(e.target.value)}
          className="input-field"
          style={{ fontSize: '15px', padding: '4px 8px', width: '110px' }}
        >
          <option value="">모양구분</option>
          <option value="RD">RD (라운드)</option>
          <option value="BG">BG (바게트)</option>
          <option value="SQ">SQ (사각)</option>
          <option value="OV">OV (오발)</option>
        </select>

        <select
          value={searchCriteria}
          onChange={(e) => setSearchCriteria(e.target.value)}
          className="input-field"
          style={{ fontSize: '15px', padding: '4px 8px', width: '100px' }}
        >
          <option value="stone_name">스톤명</option>
          <option value="note">비고</option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="input-field"
          style={{ fontSize: '15px', padding: '4px 8px', width: '100px' }}
        >
          <option value="no_asc">등록순▲</option>
          <option value="name_asc">이름순▲</option>
          <option value="name_desc">이름순▼</option>
          <option value="price_desc">공급가▼</option>
        </select>

        <input
          type="text"
          placeholder="검색할 스톤명을 입력해 주세요..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="input-field"
          style={{ fontSize: '15px', padding: '4px 8px', flex: 1 }}
        />

        <button 
          onClick={() => { setSearchKeyword(''); setFilterName(''); setFilterShape(''); }}
          className="btn-primary"
          style={{ padding: '6px', background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
          title="필터 초기화"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Count indicators */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-muted)' }}>
        <div>조회 결과: <strong>{filteredStones.length} 건</strong> / 전체 {stones.length} 건 등록됨</div>
        <div>장부 연동 상태: 양호</div>
      </div>

      {/* List Table (Wide full-width size) */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '16px', minWidth: '950px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', background: 'rgba(255, 255, 255, 0.01)', height: '36px' }}>
              <th style={{ padding: '8px', width: '50px', textAlign: 'left' }}>No</th>
              <th style={{ padding: '8px', width: '60px', textAlign: 'left' }}>조회</th>
              <th style={{ padding: '8px', width: '250px', textAlign: 'left' }}>스톤명</th>
              <th style={{ padding: '8px', width: '200px', textAlign: 'left' }}>비고</th>
              <th style={{ padding: '8px', width: '90px', textAlign: 'left' }}>중량(g)</th>
              <th style={{ padding: '8px', width: '100px', textAlign: 'left' }}>구매단가</th>
              <th style={{ padding: '8px', width: '80px', textAlign: 'left', color: 'var(--primary)' }}>1등급</th>
              <th style={{ padding: '8px', width: '80px', textAlign: 'left', color: 'var(--primary)' }}>2등급</th>
              <th style={{ padding: '8px', width: '80px', textAlign: 'left', color: 'var(--primary)' }}>3등급</th>
              <th style={{ padding: '8px', width: '80px', textAlign: 'left', color: 'var(--primary)' }}>4등급</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStones.map((s, idx) => (
              <tr 
                key={s.stone_id} 
                style={{ 
                  borderBottom: '1px solid var(--border-color)', 
                  height: '40px',
                  backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)'
                }}
              >
                <td style={{ padding: '8px', textAlign: 'left', color: 'var(--text-muted)' }}>{startIndex + idx + 1}</td>
                
                {/* Action trigger */}
                <td style={{ padding: '8px', textAlign: 'left' }}>
                  {catalog.some(c => c.default_stones?.some(ds => ds.stone_id === s.stone_id)) ? (
                    <button 
                      onClick={() => handleSelectStone(s)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: 'var(--primary)', 
                        textDecoration: 'underline', 
                        cursor: 'pointer',
                        fontSize: '15px',
                        fontWeight: '600'
                      }}
                    >
                      조회
                    </button>
                  ) : (
                    ''
                  )}
                </td>
                
                <td style={{ padding: '8px', textAlign: 'left', fontWeight: '600' }}>{s.name}</td>
                <td style={{ padding: '8px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '15px' }}>
                  {s.note || '-'}
                </td>
                <td style={{ padding: '8px', textAlign: 'left', fontFamily: 'var(--font-title)' }}>
                  {s.weight_carat ? s.weight_carat.toFixed(3) : '-'}
                </td>
                <td style={{ padding: '8px', textAlign: 'left', fontFamily: 'var(--font-title)' }}>
                  {s.purchase_price ? s.purchase_price.toLocaleString() : '-'}
                </td>
                
                {/* Mapped columns */}
                <td style={{ padding: '8px', textAlign: 'left', fontFamily: 'var(--font-title)', fontWeight: '500' }}>
                  {s.grade_prices.grade_1.toLocaleString()}
                </td>
                <td style={{ padding: '8px', textAlign: 'left', fontFamily: 'var(--font-title)', fontWeight: '500' }}>
                  {s.grade_prices.grade_2.toLocaleString()}
                </td>
                <td style={{ padding: '8px', textAlign: 'left', fontFamily: 'var(--font-title)', fontWeight: '500' }}>
                  {s.grade_prices.grade_3.toLocaleString()}
                </td>
                <td style={{ padding: '8px', textAlign: 'left', fontFamily: 'var(--font-title)', fontWeight: '500' }}>
                  {s.grade_prices.grade_4.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Control */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', marginTop: '16px', flexWrap: 'wrap' }}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="btn-primary"
            style={{ 
              fontSize: '12px', 
              padding: '4px 10px', 
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
                  onClick={() => setCurrentPage(page)}
                  style={{
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                    background: isActive ? 'rgba(170, 133, 19, 0.15)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text-main)',
                    fontWeight: isActive ? 'bold' : 'normal',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {page}
                </button>
              );
            });
          })()}
          
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="btn-primary"
            style={{ 
              fontSize: '12px', 
              padding: '4px 10px', 
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


      {/* Used Catalog Items Modal */}
      {selectedStoneForUsedList && createPortal(
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%', 
            backgroundColor: 'rgba(0, 0, 0, 0.75)', 
            backdropFilter: 'blur(4px)', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            zIndex: 9999 
          }}
          onClick={() => setSelectedStoneForUsedList(null)}
        >
          <div 
            className="glass-panel" 
            style={{ 
              width: '90%', 
              maxWidth: '800px', 
              maxHeight: '80vh', 
              overflowY: 'auto', 
              border: '1px solid var(--primary)', 
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)', 
              padding: '24px', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px' 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Gem size={18} style={{ color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>
                  [{selectedStoneForUsedList.name} ({selectedStoneForUsedList.shape} / {selectedStoneForUsedList.size})] 사용 상품 목록
                </h3>
              </div>
              <button 
                onClick={() => setSelectedStoneForUsedList(null)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--text-muted)', 
                  cursor: 'pointer', 
                  fontSize: '21px',
                  fontWeight: '600'
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
              총 <strong style={{ color: 'var(--primary)' }}>{usedCatalogItems.length}개</strong>의 카탈로그 상품에 기본 세팅으로 사용되고 있습니다.
            </div>

            <div style={{ overflowX: 'auto' }}>
              {usedCatalogItems.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', height: '32px', background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '8px', width: '80px', textAlign: 'center' }}>이미지</th>
                      <th style={{ padding: '8px' }}>모델번호</th>
                      <th style={{ padding: '8px' }}>카테고리</th>
                      <th style={{ padding: '8px' }}>제조사</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>기본 중량(g)</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>재고 수량</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>스톤 수량</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usedCatalogItems.map(c => {
                      const stoneInfo = c.default_stones.find(ds => ds.stone_id === selectedStoneForUsedList.stone_id);
                      return (
                        <tr key={c.model_number} style={{ borderBottom: '1px solid var(--border-color)', height: '50px' }}>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {c.images && c.images[0] ? (
                              <img 
                                src={c.images[0]} 
                                alt={c.model_number} 
                                style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                                onError={(e) => {
                                  // 깨진 이미지 핸들링
                                  (e.target as HTMLImageElement).src = '';
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const parent = (e.target as HTMLImageElement).parentElement;
                                  if (parent && !parent.querySelector('.no-img-box')) {
                                    const noImgDiv = document.createElement('div');
                                    noImgDiv.className = 'no-img-box';
                                    noImgDiv.style.width = '36px';
                                    noImgDiv.style.height = '36px';
                                    noImgDiv.style.borderRadius = '4px';
                                    noImgDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                    noImgDiv.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                                    noImgDiv.style.color = 'var(--text-muted)';
                                    noImgDiv.style.fontSize = '8px';
                                    noImgDiv.style.display = 'flex';
                                    noImgDiv.style.alignItems = 'center';
                                    noImgDiv.style.justifyContent = 'center';
                                    noImgDiv.innerText = 'No Img';
                                    parent.appendChild(noImgDiv);
                                  }
                                }}
                              />
                            ) : (
                              <div style={{ 
                                width: '36px', 
                                height: '36px', 
                                borderRadius: '4px', 
                                backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                                border: '1px solid rgba(255, 255, 255, 0.1)', 
                                color: 'var(--text-muted)', 
                                fontSize: '11px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center' 
                              }}>
                                No Img
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '8px', fontWeight: '700' }}>{c.model_number}</td>
                          <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{c.category}</td>
                          <td style={{ padding: '8px' }}>{c.manufacturer || '-'}</td>
                          <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-title)' }}>
                            {c.base_weight ? `${c.base_weight.toFixed(2)}g` : '-'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-title)' }}>
                            {c.stock_qty !== undefined ? `${c.stock_qty}개` : '-'}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: 'var(--primary)' }}>
                            {stoneInfo ? `${stoneInfo.quantity}개` : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '16px' }}>
                  해당 스톤이 사용된 카탈로그 등록 상품이 없습니다.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button 
                onClick={() => setSelectedStoneForUsedList(null)} 
                className="btn-primary"
                style={{ padding: '6px 16px', fontSize: '15px' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
