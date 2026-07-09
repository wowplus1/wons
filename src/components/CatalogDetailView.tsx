// src/components/CatalogDetailView.tsx
import React, { useEffect, useState } from 'react';
import { useErpStore } from '../store/useErpStore';
import type { CatalogItem } from '../firebase/mockDb';
import { X, ExternalLink, Image as ImageIcon } from 'lucide-react';

export const CatalogDetailView: React.FC = () => {
  const { catalog, stones, fetchDb, deleteCatalogItem } = useErpStore();
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const handleDelete = async () => {
    if (!item) return;
    if (window.confirm(`${item.model_number} 상품을 카탈로그에서 완전히 삭제하시겠습니까?`)) {
      try {
        await deleteCatalogItem(item.model_number);
        alert("삭제가 완료되었습니다.");
        if (window.opener) {
          try {
            if (typeof window.opener.syncErpDb === 'function') {
              window.opener.syncErpDb();
            } else {
              window.opener.location.reload();
            }
          } catch (e) {
            console.error("Failed to sync opener window", e);
          }
          window.close();
        } else {
          window.location.href = './';
        }
      } catch (e) {
        alert("삭제 중 오류가 발생했습니다.");
      }
    }
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchDb();
  }, [fetchDb]);

  useEffect(() => {
    // URL query parameter ?model=MODEL_NO 에서 모델번호 획득
    const queryParams = new URLSearchParams(window.location.search);
    const modelNo = queryParams.get('model');
    if (modelNo && catalog.length > 0) {
      const matched = catalog.find(c => c.model_number.toUpperCase() === modelNo.toUpperCase());
      if (matched) {
        setItem(matched);
      }
    }
  }, [catalog, window.location.search]);

  if (!item) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
        <div className="glass-panel" style={{ textAlign: 'center', padding: '30px' }}>
          <p style={{ marginBottom: '12px' }}>상품 데이터를 불러오는 중이거나 존재하지 않는 모델입니다.</p>
          <button onClick={() => {
            if (window.opener) {
              window.close();
            } else {
              window.location.href = './';
            }
          }} className="btn-primary" style={{ padding: '6px 16px' }}>닫기</button>
        </div>
      </div>
    );
  }

  // 카테고리 한글명 전환 헬퍼
  const getCategoryKo = (cat: string) => {
    switch (cat) {
      case 'Ring': return '반지 [중량]';
      case 'Necklace': return '목걸이 [중량]';
      case 'Earring': return '귀걸이 [중량]';
      case 'Set': return '세트상품 [묶음]';
      default: return cat;
    }
  };

  // 대표 재질 (기본은 첫번째 혹은 14K)
  const mainMaterial = item.materials[0] || '14K';

  // 스톤의 총 중량 계산 (스톤중량)
  const totalStonesWeight = item.default_stones.reduce((sum, ds) => {
    const matchedStone = stones.find(s => s.stone_id === ds.stone_id);
    return sum + ((matchedStone?.weight_carat || 0) * ds.quantity);
  }, 0);

  // 수동 차감 중량 및 총 차감 중량
  const manualDeductionWeight = item.manual_deduction_weight || 0;
  const totalDeductionWeight = totalStonesWeight + manualDeductionWeight;

  // 순수 금중량 (기본중량 - 총 차감중량)
  const pureGoldWeight = Math.max(0, (item.base_weight || 0) - totalDeductionWeight);

  // 금 시세 및 금값 계산
  const goldCost = 0; // 금값은 연산하지 않고 추가공임에 별도 입력하므로 0 고정


  // 1~4등급의 공임 단가 맵
  const materialLaborMap = (() => {
    if (item.labor_fees_v2 && item.labor_fees_v2[mainMaterial]) {
      const baseFee = item.labor_fees_v2[mainMaterial].find(f => f.type === '기본');
      if (baseFee) {
        return {
          grade_1: Number(baseFee.grade_1) || 0,
          grade_2: Number(baseFee.grade_2) || 0,
          grade_3: Number(baseFee.grade_3) || 0,
          grade_4: Number(baseFee.grade_4) || 0,
          color: baseFee.color || '전체'
        };
      }
    }
    return {
      ...(item.base_labor_fees[mainMaterial] || {
        grade_1: 60000,
        grade_2: 60000,
        grade_3: 60000,
        grade_4: 60000
      }),
      color: 'G'
    };
  })();

  // 스톤 세팅 추가공임 계산
  const stoneQty = item.default_stones.reduce((sum, s) => sum + s.quantity, 0);

  // 관련 제품 목록 (세트 모델 번호가 설정된 경우 해당되는 카탈로그 아이템들만 노출)
  const relatedItems = catalog.filter(c => {
    if (c.model_number === item.model_number) return false;
    if (item.set_model_numbers && item.set_model_numbers.length > 0) {
      return item.set_model_numbers.some(
        num => num.trim().toUpperCase() === c.model_number.trim().toUpperCase()
      );
    }
    return false;
  });

  return (
    <div style={{ background: 'var(--bg-base)', minHeight: '100vh', padding: isMobile ? '8px' : '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '820px', background: 'var(--bg-surface-solid)', border: '1px solid var(--primary)', padding: isMobile ? '12px' : '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        
        {/* 상단 닫기/컨트롤 바 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '12px' }}>
          <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--primary)', letterSpacing: '0.05em' }}>
            원스쥬얼리 PRODUCT DETAIL
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={() => {
                window.location.search = `?popup=catalog&model=${encodeURIComponent(item.model_number)}`;
              }} 
              style={{ 
                background: 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)', 
                border: 'none', 
                color: 'var(--text-inverse)', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '15px',
                fontWeight: '600'
              }} 
              title="수정"
            >
              <ExternalLink size={12} /> <span>수정</span>
            </button>
            <button 
              onClick={handleDelete}
              style={{ 
                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', 
                border: 'none', 
                color: 'var(--text-inverse)', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '15px',
                fontWeight: '600'
              }} 
              title="삭제"
            >
              <X size={12} /> <span>삭제</span>
            </button>
            <button 
              onClick={() => {
                if (window.opener) {
                  window.close();
                } else {
                  window.location.href = './';
                }
              }} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: 'var(--text-muted)', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px' 
              }} 
              title="닫기"
            >
              <X size={18} /> <span style={{ fontSize: '14px' }}>닫기</span>
            </button>
          </div>
        </div>

        {/* 1. 상품 대형 이미지 */}
        <div style={{ width: '100%', height: isMobile ? '240px' : '380px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', marginBottom: '16px', background: '#0a0a0f', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          {item.images && item.images.length > 0 ? (
            <img src={item.images[0]} alt={item.model_number} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
              <ImageIcon size={48} />
              <span>등록된 이미지가 없습니다</span>
            </div>
          )}
        </div>

        {/* 2. 상세 정보 테이블 Grid */}
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '16px', fontSize: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>모델명:</span>
              <strong style={{ fontSize: '17px', color: 'var(--primary)' }}>{item.model_number}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>분류:</span>
              <strong>{getCategoryKo(item.category)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>표준 중량:</span>
              <strong>{item.materials.join(', ')}[{pureGoldWeight.toFixed(2)}] g</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>스톤 중량:</span>
              <strong style={{ color: 'var(--danger)' }}>{totalDeductionWeight.toFixed(3)} g</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>합계 중량:</span>
              <strong style={{ color: 'var(--primary)' }}>{item.base_weight ? item.base_weight.toFixed(3) : '0.000'} g</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>제조번호:</span>
              <strong>{item.manufacturer_code || '-'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>매입처:</span>
              <strong>{item.vendor || '-'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>재고 / 대여 / 판매:</span>
              <span>
                재고: <strong style={{ color: '#5b92e5' }}>{item.stock_qty || 0}</strong> | 
                대여: <strong style={{ color: '#5b92e5' }}>{item.rental_qty || 0}</strong> | 
                판매: <strong style={{ color: '#5b92e5' }}>{item.sold_qty || 0}</strong>
              </span>
            </div>
            
            {/* 등급별 공임비 */}
            <div style={{ marginTop: '8px', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ background: 'rgba(212,175,55,0.1)', padding: '6px', fontWeight: 'bold', fontSize: '14px', textAlign: 'center', color: 'var(--primary)' }}>
                [{mainMaterial}] 등급별 공임비 분석
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border-color)', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden', marginBottom: '16px', fontSize: '14px' }}>
            {/* Row 1 Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.2fr 2.4fr', background: 'rgba(212,175,55,0.05)', fontWeight: '700', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', textAlign: 'center', minHeight: '26px', alignItems: 'center' }}>
              <div style={{ borderRight: '1px solid var(--border-color)', padding: '6px' }}>모델명</div>
              <div style={{ borderRight: '1px solid var(--border-color)', padding: '6px' }}>분류</div>
              <div style={{ borderRight: '1px solid var(--border-color)', padding: '6px' }}>표준중량</div>
              <div style={{ padding: '6px' }}>[{mainMaterial}] 공임 및 시세</div>
            </div>

            {/* Row 1 Data & Nested Table */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.2fr 2.4fr', background: 'rgba(255,255,255,0.01)', minHeight: '120px' }}>
              {/* 모델명 */}
              <div style={{ borderRight: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px', fontSize: '16px', fontWeight: '800' }}>
                <a href="#" style={{ color: '#5b92e5', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {item.model_number}
                  <ExternalLink size={10} />
                </a>
              </div>
              {/* 분류 */}
              <div style={{ borderRight: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px', textAlign: 'center' }}>
                {getCategoryKo(item.category)}
              </div>
              {/* 표준중량 */}
              <div style={{ borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '8px', textAlign: 'center', gap: '4px' }}>
                <span style={{ fontWeight: '600' }}>{item.materials.join(', ')}[{pureGoldWeight.toFixed(2)}]</span>
                <span style={{ color: 'var(--danger)', fontSize: '15px', fontWeight: '700' }} title="스톤 중량">
                  스톤: {totalDeductionWeight.toFixed(3)} g
                </span>
                <span style={{ color: 'var(--primary)', fontSize: '15px', fontWeight: '700' }} title="합계 중량">
                  합계: {item.base_weight ? item.base_weight.toFixed(3) : '0.000'} g
                </span>
              </div>
              {/* [14K] 공임 및 시세 Nested Table */}
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '4px', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>{materialLaborMap.color}</th>
                      <th style={{ padding: '4px', borderRight: '1px solid var(--border-color)' }}>기본</th>
                      <th style={{ padding: '4px', borderRight: '1px solid var(--border-color)' }}>알</th>
                      <th style={{ padding: '4px', borderRight: '1px solid var(--border-color)', color: 'var(--primary)' }}>합계</th>
                      <th style={{ padding: '4px', color: 'var(--primary)' }}>시세</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4].map(g => {
                      const baseCost = (materialLaborMap as any)[`grade_${g}`] ?? 60000;
                      const gradeStoneLaborSum = item.default_stones.reduce((sum, ds) => {
                        const matchedStone = stones.find(s => s.stone_id === ds.stone_id);
                        if (!matchedStone) return sum;
                        const gradePrice = Number(matchedStone.grade_prices[`grade_${g}`]) || 0;
                        return sum + (gradePrice * ds.quantity);
                      }, 0);
                      const gradeStoneLaborTotal = gradeStoneLaborSum + (stoneQty * item.extra_labor_fee);
                      const totalCost = baseCost + gradeStoneLaborTotal;
                      return (
                        <tr key={g} style={{ borderBottom: g < 4 ? '1px solid var(--border-color)' : 'none' }}>
                          <td style={{ padding: '3px', textAlign: 'center', borderRight: '1px solid var(--border-color)', fontWeight: '700' }}>{g}등</td>
                          <td style={{ padding: '3px', borderRight: '1px solid var(--border-color)' }}>{baseCost.toLocaleString()}</td>
                          <td style={{ padding: '3px', borderRight: '1px solid var(--border-color)' }}>{gradeStoneLaborTotal.toLocaleString()}</td>
                          <td style={{ padding: '3px', borderRight: '1px solid var(--border-color)', fontWeight: '700', color: 'var(--primary)' }}>{totalCost.toLocaleString()}</td>
                          <td style={{ padding: '3px', fontWeight: '700', color: 'var(--primary)' }}>{(totalCost + goldCost).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Row 2 Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', background: 'rgba(212,175,55,0.05)', fontWeight: '700', color: 'var(--primary)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', textAlign: 'center', minHeight: '26px', alignItems: 'center' }}>
              <div style={{ borderRight: '1px solid var(--border-color)', padding: '6px' }}>제조번호</div>
              <div style={{ borderRight: '1px solid var(--border-color)', padding: '6px' }}>매입처</div>
              <div style={{ borderRight: '1px solid var(--border-color)', padding: '6px' }}>재고개수</div>
              <div style={{ borderRight: '1px solid var(--border-color)', padding: '6px' }}>대여개수</div>
              <div style={{ padding: '6px' }}>판매개수</div>
            </div>

            {/* Row 2 Data */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', background: 'rgba(255,255,255,0.01)', textAlign: 'center', minHeight: '30px', alignItems: 'center' }}>
              <div style={{ borderRight: '1px solid var(--border-color)', padding: '6px', fontWeight: '600' }}>{item.manufacturer_code || '김숙희N'}</div>
              <div style={{ borderRight: '1px solid var(--border-color)', padding: '6px', fontWeight: '600' }}>{item.vendor || 'JP'}</div>
              <div style={{ borderRight: '1px solid var(--border-color)', padding: '6px' }}>
                <a href="#" style={{ color: '#5b92e5', textDecoration: 'underline', fontWeight: '700' }}>
                  {item.stock_qty || 0}
                </a>
              </div>
              <div style={{ borderRight: '1px solid var(--border-color)', padding: '6px' }}>
                <a href="#" style={{ color: '#5b92e5', textDecoration: 'underline', fontWeight: '700' }}>
                  {item.rental_qty || 0}
                </a>
              </div>
              <div style={{ padding: '6px' }}>
                <a href="#" style={{ color: '#5b92e5', textDecoration: 'underline', fontWeight: '700' }}>
                  {item.sold_qty || 0}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* 3. 스톤 사양 테이블 */}
        <div style={{ marginBottom: '16px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: 'rgba(212,175,55,0.05)', color: 'var(--primary)', height: '26px' }}>
                <th style={{ padding: '6px 10px', width: '40%', borderRight: '1px solid var(--border-color)' }}>스톤명</th>
                <th style={{ padding: '6px 10px', width: '20%', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>알수</th>
                <th style={{ padding: '6px 10px', width: '40%' }}>비고</th>
              </tr>
            </thead>
            <tbody>
              {item.default_stones.length > 0 ? (
                item.default_stones.map((ds) => {
                  const matchedStone = stones.find(s => s.stone_id === ds.stone_id);
                  return (
                    <React.Fragment key={ds.stone_id}>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: '700', borderRight: '1px solid var(--border-color)' }}>
                          {matchedStone ? matchedStone.name : ds.stone_id}
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: '700', color: 'var(--primary)', borderRight: '1px solid var(--border-color)' }}>
                          {ds.quantity}
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                          {ds.description || ''}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              ) : (
                <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                  <td style={{ padding: '8px 10px', color: 'var(--text-muted)', borderRight: '1px solid var(--border-color)' }}>세팅 스톤 없음</td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>0</td>
                  <td style={{ padding: '8px 10px' }}>기타: 없음</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. 관련제품 썸네일 그리드 */}
        {relatedItems.length > 0 && (
          <div>
            <span style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: '700', display: 'block', marginBottom: '8px', background: 'rgba(212,175,55,0.05)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              관련제품 목록
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(7, 1fr)', gap: '6px', padding: '4px' }}>
              {relatedItems.map((relItem) => {
                const imgUrl = relItem.images[0] || 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=150';
                return (
                  <div 
                    key={relItem.model_number}
                    onClick={() => {
                      window.location.search = `?popup=catalog_detail&model=${encodeURIComponent(relItem.model_number)}`;
                    }}
                    style={{ 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '4px', 
                      overflow: 'hidden', 
                      aspectRatio: '1', 
                      cursor: 'pointer',
                      background: '#0a0a0f',
                      transition: 'border-color 0.2s ease, transform 0.2s ease'
                    }}
                    className="catalog-card"
                    title={`${relItem.model_number} 상세보기로 이동`}
                  >
                    <img src={imgUrl} alt={relItem.model_number} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4.5 기타 설명 및 사양 정보 */}
        {item.note && item.note.trim() !== '' && (
          <div style={{ marginBottom: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.01)' }}>
            <span style={{ fontSize: '15px', color: 'var(--primary)', fontWeight: '600', display: 'block', borderBottom: '1px dashed var(--border-color)', paddingBottom: '4px', marginBottom: '8px' }}>
              기타 설명 및 사양 정보
            </span>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
              {item.note}
            </div>
          </div>
        )}

        {/* 5. 닫기 버튼 */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          <button onClick={() => {
            if (window.opener) {
              window.close();
            } else {
              window.location.href = './';
            }
          }} className="btn-primary" style={{ padding: '6px 24px' }}>
            확인 및 닫기
          </button>
        </div>

      </div>
    </div>
  );
};
