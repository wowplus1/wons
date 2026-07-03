// src/components/JewelryWorkListPrint.tsx
import React, { useState, useEffect } from 'react';
import { useErpStore } from '../store/useErpStore';
import { Printer, Eye, EyeOff } from 'lucide-react';

export const JewelryWorkListPrint: React.FC = () => {
  const { orders, catalog } = useErpStore();
  
  // URL 쿼리 파라미터에서 ids 및 showPrice 설정 읽어오기
  const queryParams = new URLSearchParams(window.location.search);
  const idsParam = queryParams.get('ids') || '';
  const showPriceParam = queryParams.get('showPrice') !== 'false'; // 기본값: true
  const rowIds = idsParam ? idsParam.split(',') : [];

  const [showPrice, setShowPrice] = useState<boolean>(showPriceParam);

  // 선택된 주문 품목(OrderItem) 매핑 및 원본 주문 메타데이터 파싱
  const selectedItems = rowIds.map(rowId => {
    if (!rowId.startsWith('order-item::')) return null;
    
    // rowId 포맷: order-item::${order_id}::${item_id}::${itemIdx}
    const parts = rowId.split('::');
    const orderId = parts[1];
    const itemId = parseInt(parts[2] || '0');

    const order = orders.find(o => o.order_id === orderId);
    if (!order) return null;
    const item = order.items.find(i => i.item_id === itemId);
    if (!item) return null;

    // 카탈로그 이미지 검색
    const catalogItem = catalog.find(c => c.model_number === item.model_number);
    const imageUrl = catalogItem?.images?.[0] || '';

    return {
      rowId,
      orderId: order.order_id,
      orderDate: order.order_date,
      customerName: order.customer_snapshot?.name || '알수없음',
      item,
      imageUrl
    };
  }).filter(x => x !== null) as {
    rowId: string;
    orderId: string;
    orderDate: string;
    customerName: string;
    item: any;
    imageUrl: string;
  }[];

  useEffect(() => {
    if (selectedItems.length > 0) {
      // 컴포넌트 마운트 완료 및 렌더링 대기 후 인쇄 대화상자 호출
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [selectedItems.length]);

  if (selectedItems.length === 0) {
    return (
      <div style={{ padding: '40px', color: '#000', textAlign: 'center', fontSize: '17px', background: '#fff', minHeight: '100vh', fontFamily: 'Gulim, sans-serif' }}>
        선택된 세공 대상 주문 품목 정보가 없거나 데이터를 로드하는 데 실패했습니다.
      </div>
    );
  }

  // 중량 및 수량 총합 계산
  const totalQty = selectedItems.reduce((sum, x) => sum + (x.item.quantity || 1), 0);
  const totalGoldWeightG = selectedItems.reduce((sum, x) => sum + ((x.item.estimated_weight_g || 0) * (x.item.quantity || 1)), 0);
  const totalGoldWeightDon = totalGoldWeightG / 3.75;


  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? '-' : d.toISOString().slice(2, 10); // YY-MM-DD
    } catch {
      return '-';
    }
  };

  return (
    <div style={{ padding: '20px', background: '#f4f5f8', minHeight: '100vh', boxSizing: 'border-box', fontFamily: 'Gulim, "Malgun Gothic", sans-serif' }} className="work-list-print-container">
      
      {/* Control Panel (Screen Mode Only - Hidden in Print) */}
      <div className="no-print" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '12px 20px',
        marginBottom: '20px',
        background: '#fff',
        borderRadius: '8px',
        border: '1px solid #ddd',
        color: '#333',
        fontSize: '15px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        maxWidth: '1200px',
        margin: '0 auto 20px auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <strong style={{ color: '#c0981d', fontSize: '16px' }}>[주얼리 세공 작업지시서 인쇄 모드]</strong>
          <span>선택 품목: <strong>{selectedItems.length}</strong>건</span>
          
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'bold', userSelect: 'none' }}>
            <input 
              type="checkbox" 
              checked={showPrice} 
              onChange={(e) => setShowPrice(e.target.checked)} 
              style={{ cursor: 'pointer' }}
            />
            {showPrice ? <Eye size={14} style={{ color: '#3b82f6' }} /> : <EyeOff size={14} style={{ color: '#9ca3af' }} />}
            공임 및 금액 표시
          </label>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => window.print()}
            style={{ 
              padding: '6px 14px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              background: '#d4af37',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '15px'
            }}
          >
            <Printer size={14} /> 인쇄 대화상자 열기
          </button>
          <button 
            onClick={() => window.close()}
            style={{ 
              padding: '6px 14px', 
              background: '#fff', 
              border: '1px solid #ccc', 
              borderRadius: '4px',
              color: '#555', 
              cursor: 'pointer',
              fontSize: '15px'
            }}
          >
            창 닫기
          </button>
        </div>
      </div>

      {/* Printable Sheet Area */}
      <div style={{ 
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px',
        background: '#fff',
        color: '#000',
        border: '2px solid #000',
        boxSizing: 'border-box'
      }} className="print-sheet-box">
        
        {/* Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '15px' }}>
          <div>
            <h1 style={{ fontSize: '27px', fontWeight: '900', margin: 0, letterSpacing: '0.1em', fontFamily: 'Gulim, "Malgun Gothic", sans-serif' }}>
              주얼리 세공 작업지시서 (쥬얼리 세공리스트)
            </h1>
            <div style={{ fontSize: '14px', marginTop: '6px', color: '#333' }}>
              출력 일시: {new Date().toLocaleString()} &nbsp;&nbsp;|&nbsp;&nbsp; 총 세공 건수: {selectedItems.length}건
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '14px', lineHeight: '1.4' }}>
            <strong>출고처 (공급자):</strong> 하트 (02-766-8820)<br />
            <strong>수신처 (세공처):</strong> 세공 공장 작업실 귀하
          </div>
        </div>

        {/* Master Work Order Table */}
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          fontSize: '14px', 
          tableLayout: 'fixed',
          borderBottom: '2px solid #000'
        }}>
          <colgroup>
            <col style={{ width: '3%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '17%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '17%' }} />
            {showPrice && <col style={{ width: '7%' }} />}
            <col style={{ width: '4%' }} />
            <col style={{ width: '5%' }} />
          </colgroup>
          <thead>
            <tr style={{ background: '#f2f2f2', borderTop: '2px solid #000', borderBottom: '1px solid #000', fontWeight: 'bold', height: '28px' }}>
              <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>No</th>
              <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>의뢰일</th>
              <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'left' }}>거래처</th>
              <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>제품 사진</th>
              <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'left' }}>모델번호</th>
              <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>재질</th>
              <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>색상</th>
              <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>사이즈</th>
              <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'left' }}>스톤 세팅 스펙</th>
              <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'left' }}>세공 요청사항 (비고)</th>
              {showPrice && <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>공임비</th>}
              <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>수량</th>
              <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>확인</th>
            </tr>
          </thead>
          <tbody>
            {selectedItems.map((row, i) => {
              const { item, orderDate, customerName, imageUrl } = row;
              
              // 스톤 요약 텍스트
              const mainStoneText = item.stone_main_name ? `[메] ${item.stone_main_name} (${item.qty_main || 0}ea)` : '';
              const subStoneText = item.stone_sub_name ? `[보] ${item.stone_sub_name} (${item.qty_sub || 0}ea)` : '';
              
              // 개당 공임비 (기본+추가+스톤공임)
              const baseExtra = (item.labor_base || 0) + (item.labor_extra || 0);
              const stoneLabor = item.labor_stone_total !== undefined ? item.labor_stone_total : ((item.labor_main || 0) * (item.qty_main || 0)) + ((item.labor_sub || 0) * (item.qty_sub || 0));
              const singleLabor = baseExtra + stoneLabor;

              return (
                <tr key={row.rowId} style={{ height: '70px', pageBreakInside: 'avoid' }}>
                  {/* No */}
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{i + 1}</td>
                  
                  {/* 의뢰일 */}
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '13px' }}>
                    {formatDate(orderDate)}
                  </td>
                  
                  {/* 거래처 */}
                  <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>
                    {customerName}
                  </td>
                  
                  {/* 이미지 썸네일 */}
                  <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={item.model_number} 
                        style={{ maxWidth: '60px', maxHeight: '60px', objectFit: 'contain', display: 'block', margin: '0 auto' }} 
                      />
                    ) : (
                      <div style={{ width: '45px', height: '45px', margin: '0 auto', background: '#e5e7eb', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#9ca3af', fontSize: '12px' }}>
                        No Image
                      </div>
                    )}
                  </td>
                  
                  {/* 모델번호 */}
                  <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold', fontSize: '15px' }}>
                    {item.model_number}
                  </td>
                  
                  {/* 재질 */}
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                    {item.material}
                  </td>
                  
                  {/* 색상 */}
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>
                    {item.color}
                  </td>
                  
                  {/* 사이즈 */}
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                    {item.size || '-'}
                  </td>
                  
                  {/* 스톤 세팅 스펙 */}
                  <td style={{ border: '1px solid #000', padding: '4px', lineHeight: '1.3' }}>
                    {mainStoneText && <div>{mainStoneText}</div>}
                    {subStoneText && <div style={{ marginTop: '2px', color: '#555' }}>{subStoneText}</div>}
                    {!mainStoneText && !subStoneText && <span style={{ color: '#9ca3af' }}>스톤 없음</span>}
                  </td>
                  
                  {/* 세공 요청사항 */}
                  <td style={{ border: '1px solid #000', padding: '4px', wordBreak: 'break-all', color: '#d97706', fontWeight: 'bold' }}>
                    {item.note || '-'}
                  </td>
                  
                  {/* 공임비 */}
                  {showPrice && (
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right' }}>
                      {singleLabor.toLocaleString()}원
                    </td>
                  )}
                  {/* 수량 */}
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>
                    {item.quantity || 1}
                  </td>
                  
                  {/* 확인 */}
                  <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '17px', color: '#ccc' }}>
                    [ &nbsp; ]
                  </td>
                </tr>
              );
            })}

            {/* Summary Row */}
            <tr style={{ background: '#f9f9f9', fontWeight: 'bold', height: '30px' }}>
              <td colSpan={8} style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>
                소계 / 합계
              </td>
              <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', fontSize: '13px' }}>
                추정 중량 합계: {totalGoldWeightDon.toFixed(3)}돈 ({totalGoldWeightG.toFixed(2)}g)
              </td>
              <td style={{ border: '1px solid #000', padding: '6px' }}></td>
              {showPrice && <td style={{ border: '1px solid #000', padding: '6px' }}></td>}
              <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontSize: '16px', color: '#1e3a8a' }}>
                {totalQty}
              </td>
              <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>
                [ &nbsp; ]
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footer Confirmation sign */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', fontSize: '15px' }}>
          <div>
            * 본 작업지시서의 지시 사양에 어긋난 무단 변경 작업은 가공 불량으로 처리되오니 사전 협의 바랍니다.<br />
            * 금 중량 및 보석 세팅 상태를 작업 완료 후 꼼꼼히 확인하고 인수해 주십시오.
          </div>
          <div style={{ display: 'flex', gap: '30px', border: '1px solid #000', padding: '10px 15px' }}>
            <div style={{ textAlign: 'center' }}>
              작업 책임자 확인<br /><br />
              (인 또는 서명)
            </div>
            <div style={{ borderLeft: '1px solid #000' }}></div>
            <div style={{ textAlign: 'center' }}>
              자재/금 출고 확인<br /><br />
              (인 또는 서명)
            </div>
          </div>
        </div>

      </div>

      {/* Global CSS for Print Layout */}
      <style>{`
        @page {
          size: landscape;
          margin: 8mm 10mm;
        }
        @media print {
          body {
            background: #fff !important;
            color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .work-list-print-container {
            background: #fff !important;
            padding: 0 !important;
            min-height: auto !important;
          }
          .print-sheet-box {
            border: 2px solid #000 !important;
            padding: 15px !important;
            box-shadow: none !important;
            background: #fff !important;
            color: #000 !important;
          }
          table {
            border-color: #000 !important;
          }
          th, td {
            border-color: #000 !important;
            color: #000 !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>

    </div>
  );
};
