// src/components/JewelryWorkList.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useErpStore, getCatalogLaborFees } from '../store/useErpStore';
import { Wrench, Printer, CheckCheck, X } from 'lucide-react';

interface WorkItemRow {
  id: string; // `work-item-${order_id}-${item_id}-${itemIdx}`
  orderId: string;
  orderDate: string;
  customerName: string;
  model: string;
  material: string;
  color: string;
  size: string;
  quantity: number;
  stoneMainText: string;
  stoneSubText: string;
  note: string;
  laborSingle: number;
  totalAmount: number;
  imageUrl: string;
  estimatedWeightG: number;
  itemId: number;
  division?: string;
  stepWeights?: {
    step1?: { before: number; after: number };
    step2?: { before: number; after: number };
    step3?: { before: number; after: number };
  };
  laborCost: number;
  laborBase: number;
  laborExtra: number;
  laborMain: number;
  laborSub: number;
  qtyMain: number;
  qtySub: number;
  totalStoneQty: number;
  goldWeight: number;
  stoneWeight: number;
}

export const JewelryWorkList: React.FC = () => {
  const { orders, catalog, stones, updateMultipleItemsStatus, fetchDb, setActiveTab, updateItemStepWeights } = useErpStore();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const showPrice = true;
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  useEffect(() => {
    setCurrentPage(1);
    setCheckedItems(new Set());
  }, [orders]);

  // 무게 입력 모달을 띄우기 위한 상태
  const [activeWeightModalItem, setActiveWeightModalItem] = useState<{
    orderId: string;
    itemId: number;
    stepWeights?: {
      step1?: { before: number; after: number };
      step2?: { before: number; after: number };
      step3?: { before: number; after: number };
    };
  } | null>(null);

  // 모달 인풋용 폼 상태
  const [step1Before, setStep1Before] = useState<string>('0');
  const [step1After, setStep1After] = useState<string>('0');
  const [step2Before, setStep2Before] = useState<string>('0');
  const [step2After, setStep2After] = useState<string>('0');
  const [step3Before, setStep3Before] = useState<string>('0');
  const [step3After, setStep3After] = useState<string>('0');

  const handleOpenWeightModal = (item: any) => {
    const sw = item.stepWeights || {};
    setStep1Before(String(sw.step1?.before || ''));
    setStep1After(String(sw.step1?.after || ''));
    setStep2Before(String(sw.step2?.before || ''));
    setStep2After(String(sw.step2?.after || ''));
    setStep3Before(String(sw.step3?.before || ''));
    setStep3After(String(sw.step3?.after || ''));
    
    setActiveWeightModalItem({
      orderId: item.orderId,
      itemId: item.itemId,
      stepWeights: sw
    });
  };

  const handleSaveStepWeights = () => {
    if (!activeWeightModalItem) return;
    
    const parseVal = (val: string) => {
      const num = parseFloat(val);
      return isNaN(num) ? 0 : parseFloat(num.toFixed(2));
    };

    const stepWeights = {
      step1: { before: parseVal(step1Before), after: parseVal(step1After) },
      step2: { before: parseVal(step2Before), after: parseVal(step2After) },
      step3: { before: parseVal(step3Before), after: parseVal(step3After) }
    };
    
    updateItemStepWeights(activeWeightModalItem.orderId, activeWeightModalItem.itemId, stepWeights);
    alert('단계별 세공 무게가 정상 저장되었습니다.');
    setActiveWeightModalItem(null);
    fetchDb();
  };

  const handleOpenDetailWindow = (modelNumber: string) => {
    const w = 860;
    const h = 900;
    const left = window.screen.width / 2 - w / 2;
    const top = window.screen.height / 2 - h / 2;
    
    window.open(
      `./?popup=catalog_detail&model=${encodeURIComponent(modelNumber)}`, 
      `catalog_detail_popup_${modelNumber.replace(/[^a-zA-Z0-9가-힣]/g, '_')}`, 
      `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );
  };

  // 컴포넌트 마운트 시 최신 가상 DB 데이터를 강제 리로드하여 동기화
  useEffect(() => {
    fetchDb();
  }, [fetchDb]);

  // 1. 현재 '공장발주' 상태인 주문에서 가공 품목('판매' 및 '반품') 필터링하여 테이블 행 데이터 구축
  const workItems = React.useMemo(() => {
    const items: WorkItemRow[] = [];

    orders.forEach(order => {
      try {
        const itemsList = order.items || [];
        itemsList.forEach((item, itemIdx) => {
          try {
            const itemStatus = item.status || order.status || '접수';
            if (itemStatus !== '공장발주') return;

            const normModel = (m: string) => (m || '').replace(/\s+/g, '').toUpperCase();
            const catalogItem = catalog.find(c => normModel(c.model_number) === normModel(item.model_number));
            const imageUrl = catalogItem?.images?.[0] || '';

            // 개당 공임비 (기본+추가+스톤공임)
            const baseExtra = (item.labor_base || 0) + (item.labor_extra || 0);
            const stoneLabor = ((item.labor_main || 0) * (item.qty_main || 0)) + ((item.labor_sub || 0) * (item.qty_sub || 0));
            const laborSingle = baseExtra + stoneLabor;

            let subStoneWeightEa = 0;
            if (item.stone_sub_id) {
              const subStone = stones.find(s => s.stone_id === item.stone_sub_id);
              subStoneWeightEa = subStone?.weight_carat || 0;
            }
            const stonesWeightTotal = (item.qty_main || 0) * (item.stone_weight_ea || 0) + (item.qty_sub || 0) * subStoneWeightEa;

            // 모델 구매원가 계산
            let modelCost = item.labor_cost || 0;
            if (catalogItem) {
              const feeData = getCatalogLaborFees(catalogItem, item.material, item.color, item.grade || 1);
              modelCost = feeData.laborCost || modelCost;
            }

            // 스톤 구매단가 합계 계산 (카탈로그 기본 스톤 기준 우선 연산)
            let totalStonePurchaseCost = 0;
            if (catalogItem && catalogItem.default_stones && catalogItem.default_stones.length > 0) {
              catalogItem.default_stones.forEach(ds => {
                const stone = stones.find(s => s.stone_id === ds.stone_id);
                const purchasePrice = stone?.purchase_price || 0;
                totalStonePurchaseCost += ds.quantity * purchasePrice;
              });
            } else {
              // 폴백: 주문서에 기입된 스펙 기준
              let mainStonePurchasePrice = 0;
              if (item.stone_main_id) {
                const mainStone = stones.find(s => s.stone_id === item.stone_main_id);
                mainStonePurchasePrice = mainStone?.purchase_price || 0;
              }

              let subStonePurchasePrice = 0;
              if (item.stone_sub_id) {
                const subStone = stones.find(s => s.stone_id === item.stone_sub_id);
                subStonePurchasePrice = subStone?.purchase_price || 0;
              }

              totalStonePurchaseCost = ((item.qty_main || 0) * mainStonePurchasePrice) + ((item.qty_sub || 0) * subStonePurchasePrice);
            }
            const finalLaborCost = modelCost + totalStonePurchaseCost;
            items.push({
              id: `work-item::${order.order_id}::${item.item_id}::${itemIdx}`,
              orderId: order.order_id,
              orderDate: order.order_date,
              customerName: order.customer_snapshot?.name || '알수없음',
              model: item.model_number,
              material: item.material,
              color: item.color,
              size: item.size || '',
              quantity: item.quantity || 1,
              stoneMainText: item.stone_main_name ? `${item.stone_main_name} (${item.qty_main || 0}알)` : '',
              stoneSubText: item.stone_sub_name ? `${item.stone_sub_name} (${item.qty_sub || 0}알)` : '',
              note: item.note || '',
              laborSingle,
              totalAmount: item.calculated_price || 0,
              imageUrl,
              estimatedWeightG: item.estimated_weight_g || 0,
              itemId: item.item_id,
              division: item.division,
              stepWeights: item.step_weights,
              laborCost: finalLaborCost,
              laborBase: item.labor_base || 0,
              laborExtra: item.labor_extra || 0,
              laborMain: item.labor_main || 0,
              laborSub: item.labor_sub || 0,
              qtyMain: item.qty_main || 0,
              qtySub: item.qty_sub || 0,
              totalStoneQty: (item.qty_main || 0) + (item.qty_sub || 0),
              goldWeight: item.gold_weight || 0,
              stoneWeight: parseFloat(stonesWeightTotal.toFixed(3))
            });
          } catch (itemErr) {
            console.error("JewelryWorkList item mapping error:", itemErr, item);
          }
        });
      } catch (orderErr) {
        console.error("JewelryWorkList order status check error:", orderErr, order);
      }
    });

    return items;
  }, [orders, catalog, stones]);

  const totalPages = Math.ceil(workItems.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedWorkItems = workItems.slice(startIndex, startIndex + pageSize);

  // 체크박스 제어 로직
  const isAllChecked = paginatedWorkItems.length > 0 && paginatedWorkItems.every(r => checkedItems.has(r.id));
  
  const handleToggleAll = () => {
    const next = new Set(checkedItems);
    if (isAllChecked) {
      // 현재 페이지 항목 전체 해제
      paginatedWorkItems.forEach(r => next.delete(r.id));
    } else {
      // 현재 페이지 항목 전체 선택
      paginatedWorkItems.forEach(r => next.add(r.id));
    }
    setCheckedItems(next);
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(checkedItems);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setCheckedItems(next);
  };

  // 선택 완료 처리 (상태를 '출고대기'로 일괄 변경)
  const handleCompleteWork = async () => {
    try {
      if (checkedItems.size === 0) {
        alert('완료 처리할 세공 품목을 선택해주세요.');
        return;
      }



      const updates: { orderId: string, itemId: number }[] = [];
      checkedItems.forEach(rowId => {
        if (rowId.startsWith('work-item::')) {
          const parts = rowId.split('::');
          const orderId = parts[1];
          const itemId = Number(parts[2]);
          if (orderId && !isNaN(itemId)) {
            updates.push({ orderId, itemId });
          }
        }
      });

      if (updates.length === 0) {
        alert('선택한 세공 품목 정보를 찾지 못했습니다.');
        return;
      }

      const isConfirm = window.confirm(`선택한 ${updates.length}개 품목을 '세공 완료(출고 대기)' 상태로 승격시키겠습니까?`);
      if (!isConfirm) return;

      // 일괄 업데이트로 동시성 이슈 및 불필요한 fetchDb 중복 차단
      await updateMultipleItemsStatus(updates, '출고대기');

      alert('선택한 품목들의 세공이 완료되어 출고 대기 단계로 이동되었습니다.');
      setCheckedItems(new Set());
      fetchDb();

      // 출고대기 리스트 탭으로 화면 전환
      setTimeout(() => {
        setActiveTab('release_list');
      }, 50);
    } catch (err: any) {
      alert(`[세공 완료 처리 오류]\n완료 승인 중 에러가 발생했습니다:\n${err.message || err}`);
      console.error("handleCompleteWork error:", err);
    }
  };

  // 개별 세공 작업 되돌리기 (주문/명세서 탭 이동)
  const handleRollbackWork = async (orderId: string, itemId: number) => {
    try {
      const item = workItems.find(w => w.orderId === orderId && w.itemId === itemId);
      if (!item) {
        alert('해당 품목을 찾을 수 없습니다.');
        return;
      }

      const isConfirm = window.confirm(`해당 품목 [모델: ${item.model}]의 세공 작업을 취소하고 주문 내역/명세서 탭으로 되돌리시겠습니까?`);
      if (!isConfirm) return;

      // '접수' 상태로 되돌리기 실행
      await updateMultipleItemsStatus([{ orderId, itemId }], '접수');
      alert('주문 내역으로 되돌아갔습니다.');
      fetchDb();

      // 주문 내역 / 명세서 탭으로 이동
      setTimeout(() => {
        setActiveTab('orders');
      }, 50);
    } catch (err: any) {
      alert(`[되돌리기 처리 오류]\n상태 복구 중 에러가 발생했습니다:\n${err.message || err}`);
      console.error("handleRollbackWork error:", err);
    }
  };

  // 작업지시서 인쇄 팝업 호출
  const handlePrintWorkList = () => {
    try {
      if (checkedItems.size === 0) {
        alert('세공지시서를 인쇄할 품목을 선택해주세요.');
        return;
      }
      
      // work-item:: 접두사를 order-item:: 형태로 변환하여 호환성 유지
      const convertedIds = Array.from(checkedItems).map(id => id.replace('work-item::', 'order-item::'));
      const idsParam = convertedIds.join(',');
      
      const w = 1200;
      const h = 850;
      const left = window.screen.width / 2 - w / 2;
      const top = window.screen.height / 2 - h / 2;

      window.open(
        `/?popup=jewelry_work_list_print&ids=${encodeURIComponent(idsParam)}&showPrice=${showPrice}`,
        `jewelry_work_list_print_popup_${Date.now()}`,
        `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes`
      );
    } catch (err: any) {
      alert(`[지시서 인쇄 오류]\n인쇄창을 여는 중 에러가 발생했습니다:\n${err.message || err}`);
      console.error("handlePrintWorkList error:", err);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <h2 style={{ fontSize: '19px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wrench size={18} style={{ color: 'var(--primary)' }} />
          <span className="gradient-text" style={{ fontFamily: 'var(--font-title)', fontWeight: '600' }}>Jewelry Workshop Manager</span>
          <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>(주얼리 세공 및 작업 현황 관리대장)</span>
        </h2>
      </div>



      {/* Batch Action Buttons */}
      <div className="ledger-action-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15,23,42,0.02)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleCompleteWork}
            disabled={checkedItems.size === 0}
            className="btn-primary"
            style={{
              padding: '6px 16px',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: checkedItems.size > 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#e2e8f0',
              color: checkedItems.size > 0 ? 'var(--text-inverse)' : '#475569',
              border: checkedItems.size > 0 ? 'none' : '1.5px solid #94a3b8',
              fontWeight: 'bold',
              borderRadius: '4px',
              cursor: checkedItems.size > 0 ? 'pointer' : 'not-allowed',
              boxShadow: 'none'
            }}
          >
            <CheckCheck size={14} /> 세공 완료 처리 (출고대기 이동)
          </button>

          <button
            onClick={handlePrintWorkList}
            disabled={checkedItems.size === 0}
            className="btn-primary"
            style={{
              padding: '6px 16px',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: checkedItems.size > 0 ? 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)' : '#e2e8f0',
              color: checkedItems.size > 0 ? 'var(--text-inverse)' : '#475569',
              border: checkedItems.size > 0 ? 'none' : '1.5px solid #94a3b8',
              fontWeight: 'bold',
              borderRadius: '4px',
              cursor: checkedItems.size > 0 ? 'pointer' : 'not-allowed',
              boxShadow: 'none',
              marginLeft: '8px'
            }}
          >
            <Printer size={14} /> 선택 품목 세공지시서 인쇄
          </button>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          선택된 항목 수: <strong style={{ color: 'var(--primary)' }}>{checkedItems.size}</strong>개
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="table-responsive" style={{ overflowX: 'auto' }}>
        <table className="excel-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1300px', fontSize: '14px', tableLayout: 'fixed' }}>
          {showPrice ? (
            <colgroup>
              <col style={{ width: '3%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '5%' }} />
            </colgroup>
          ) : (
            <colgroup>
              <col style={{ width: '3%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '5%' }} />
            </colgroup>
          )}
          <thead>
            <tr style={{ background: 'rgba(15, 23, 42, 0.03)', borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <input 
                  type="checkbox" 
                  checked={isAllChecked} 
                  onChange={handleToggleAll} 
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>No</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>의뢰일</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>구분</th>
              <th style={{ padding: '8px 4px', border: '1px solid var(--border-color)' }}>세공 요청사항 (비고)</th>
              <th style={{ padding: '8px 4px', border: '1px solid var(--border-color)' }}>모델</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>재질</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>색상</th>
              <th style={{ padding: '8px 4px', border: '1px solid var(--border-color)' }}>스톤세팅스펙 (메인/보조 스톤정보)</th>
              {showPrice && <th style={{ padding: '8px 4px', textAlign: 'right', border: '1px solid var(--border-color)' }}>구매단가</th>}
              {showPrice && <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>공임단가(기본,추가,중심,보조)</th>}
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>알수합계</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>수량</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>중량(금)</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>중량(스톤)</th>
              <th style={{ padding: '8px 4px', border: '1px solid var(--border-color)' }}>단계별 세공 무게 (해리)</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>되돌리기</th>
            </tr>
          </thead>
          <tbody>
            {paginatedWorkItems.length > 0 ? (
              paginatedWorkItems.map((row, idx) => {
                return (
                  <tr 
                    key={row.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(15, 23, 42, 0.01)'
                    }}
                  >
                    {/* ✔ */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <input 
                        type="checkbox" 
                        checked={checkedItems.has(row.id)}
                        onChange={() => handleToggleRow(row.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>

                    {/* No */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: 'var(--text-muted)', verticalAlign: 'middle' }}>
                      {idx + 1}
                    </td>

                    {/* 의뢰일 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: 'var(--text-muted)', verticalAlign: 'middle' }}>
                      {(() => {
                        try {
                          const d = new Date(row.orderDate);
                          return isNaN(d.getTime()) ? '-' : d.toISOString().slice(5, 10);
                        } catch {
                          return '-';
                        }
                      })()}
                    </td>

                    {/* 구분 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                      <span className="badge" style={{
                        background: row.division === '결제' ? 'rgba(59, 130, 246, 0.15)' 
                                  : row.division === 'DC' ? 'rgba(239, 68, 68, 0.15)'
                                  : row.division === '반품' ? 'rgba(168, 85, 247, 0.15)'
                                  : 'rgba(16, 185, 129, 0.15)',
                        color: row.division === '결제' ? '#3b82f6'
                             : row.division === 'DC' ? '#ef4444'
                             : row.division === '반품' ? '#a855f7'
                             : '#10b981',
                        border: '1px solid currentColor',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        {row.division || '판매'}
                      </span>
                    </td>

                    {/* 세공 요청사항(비고) */}
                    <td style={{ padding: '6px 4px', verticalAlign: 'middle', color: '#fbbf24', fontWeight: 'bold' }}>
                      {row.note || '-'}
                    </td>

                    {/* 모델 */}
                    <td style={{ padding: '6px 4px', fontWeight: '700', color: '#38bdf8', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span 
                          onClick={() => handleOpenDetailWindow(row.model)} 
                          style={{ textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          {row.model}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>({row.customerName})</span>
                      </div>
                    </td>

                    {/* 재질 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>
                      {row.material}
                    </td>

                    {/* 색상 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                      {row.color}
                    </td>

                    {/* 스톤세팅스펙 */}
                    <td style={{ padding: '6px 4px', lineHeight: '1.3', verticalAlign: 'middle' }}>
                      {row.stoneMainText && <div style={{ color: 'var(--text-main)' }}>{row.stoneMainText}</div>}
                      {row.stoneSubText && <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{row.stoneSubText}</div>}
                      {!row.stoneMainText && !row.stoneSubText && <span style={{ color: 'var(--text-muted)' }}>스톤 없음</span>}
                    </td>

                    {/* 구매단가 */}
                    {showPrice && (
                      <td style={{ padding: '6px 4px', textAlign: 'right', verticalAlign: 'middle', color: '#10b981', fontWeight: '600' }}>
                        {row.laborCost.toLocaleString()}원
                      </td>
                    )}

                    {/* 공임단가 */}
                    {showPrice && (
                      <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', fontSize: '13px', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-around', gap: '2px' }}>
                          <span title="기본">{row.laborBase.toLocaleString()}</span>
                          <span>/</span>
                          <span title="추가">{row.laborExtra.toLocaleString()}</span>
                          <span>/</span>
                          <span title="중심">{row.laborMain.toLocaleString()}</span>
                          <span>/</span>
                          <span title="보조">{row.laborSub.toLocaleString()}</span>
                        </div>
                      </td>
                    )}

                    {/* 알수합계 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>
                      {row.totalStoneQty}알
                    </td>

                    {/* 수량 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle', fontSize: '15px' }}>
                      {row.quantity}
                    </td>

                    {/* 중량(금) */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', color: '#eab308' }}>
                      {row.goldWeight > 0 ? `${row.goldWeight.toFixed(2)}g` : '-'}
                    </td>

                    {/* 중량(스톤) */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', color: 'var(--text-muted)' }}>
                      {row.stoneWeight > 0 ? `${row.stoneWeight.toFixed(3)}g` : '-'}
                    </td>

                    {/* 단계별 세공 무게 (해리) */}
                    <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                      {row.division === '결제' || row.model === '디자인출력' ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
                          {row.model === '디자인출력' ? '디자인출력 (해리 없음)' : '결제 구분 (해리 없음)'}
                        </div>
                      ) : (() => {
                        const sw = row.stepWeights;
                        const hasWeights = sw && (
                          (sw.step1?.before || sw.step1?.after || 
                           sw.step2?.before || sw.step2?.after || 
                           sw.step3?.before || sw.step3?.after)
                        );
                        
                        if (!hasWeights) {
                          return (
                            <div style={{ textAlign: 'center' }}>
                              <button
                                onClick={() => handleOpenWeightModal(row)}
                                className="btn-primary"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '14px',
                                  background: 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)',
                                  color: 'var(--text-inverse)',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                무게입력
                              </button>
                            </div>
                          );
                        }

                        const before1 = sw?.step1?.before || 0;
                        const after1 = sw?.step1?.after || 0;
                        const before2 = sw?.step2?.before || 0;
                        const after2 = sw?.step2?.after || 0;
                        const before3 = sw?.step3?.before || 0;
                        const after3 = sw?.step3?.after || 0;

                        const loss1 = parseFloat(Math.max(0, before1 - after1).toFixed(2));
                        const loss2 = parseFloat(Math.max(0, before2 - after2).toFixed(2));
                        const loss3 = parseFloat(Math.max(0, before3 - after3).toFixed(2));
                        const totalLoss = parseFloat((loss1 + loss2 + loss3).toFixed(2));


                        let initialBefore = 0;
                        if (before1 > 0) initialBefore = before1;
                        else if (before2 > 0) initialBefore = before2;
                        else if (before3 > 0) initialBefore = before3;
                        const totalLossPct = initialBefore > 0 ? ((totalLoss / initialBefore) * 100).toFixed(2) : '0.00';

                        return (
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: 'bold', 
                            color: 'var(--primary)', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '4px 2px'
                          }}>
                            <span>총 해리: {totalLoss.toFixed(2)}g ({totalLossPct}%)</span>
                            <button
                              onClick={() => handleOpenWeightModal(row)}
                              style={{
                                padding: '2px 8px',
                                fontSize: '13px',
                                background: 'rgba(15,23,42,0.05)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                marginLeft: '8px'
                              }}
                            >
                              수정
                            </button>
                          </div>
                        );
                      })()}
                    </td>

                    {/* 액션 (되돌리기 단축버튼) */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <button
                        onClick={() => handleRollbackWork(row.orderId, row.itemId)}
                        className="btn-primary"
                        style={{
                          padding: '4px 8px',
                          fontSize: '13px',
                          background: 'rgba(239, 68, 68, 0.1)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        되돌리기
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={22} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>
                  현재 작업실에서 진행 중인 세공 품목이 없습니다.<br />
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>[주문 내역 / 명세서] 탭 대장에서 가공 품목을 체크하고 '세공리스트로 보내기' 버튼을 클릭해 작업을 개시해 주십시오.</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => {
                setCurrentPage(prev => Math.max(1, prev - 1));
              }}
              className="btn-primary"
              style={{
                padding: '5px 12px',
                fontSize: '13px',
                background: currentPage === 1 ? 'rgba(0,0,0,0.02)' : 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)',
                color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-inverse)',
                border: currentPage === 1 ? '1px solid var(--border-color)' : 'none',
                boxShadow: currentPage === 1 ? 'none' : '0 2px 6px rgba(37, 99, 235, 0.15)',
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
                    }}
                    className="btn-primary"
                    style={{
                      padding: '5px 12px',
                      fontSize: '13px',
                      minWidth: '32px',
                      background: isActive ? 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)' : 'transparent',
                      color: isActive ? 'var(--text-inverse)' : 'var(--text-muted)',
                      border: isActive ? 'none' : '1px solid var(--border-color)',
                      boxShadow: isActive ? '0 2px 6px rgba(37, 99, 235, 0.15)' : 'none',
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
              }}
              className="btn-primary"
              style={{
                padding: '5px 12px',
                fontSize: '13px',
                background: currentPage === totalPages ? 'rgba(0,0,0,0.02)' : 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)',
                color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-inverse)',
                border: currentPage === totalPages ? '1px solid var(--border-color)' : 'none',
                boxShadow: currentPage === totalPages ? 'none' : '0 2px 6px rgba(37, 99, 235, 0.15)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 무게 입력/수정 모달 */}
      {activeWeightModalItem && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <div className="glass-panel responsive-modal" style={{
            width: '450px',
            background: 'var(--bg-surface-solid)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)'
          }}>
            {/* 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Wrench size={16} style={{ color: 'var(--primary)' }} />
                <span>단계별 세공 무게 입력 (손실/혜리 기록)</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setActiveWeightModalItem(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* 폼 영역 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* 1단계 */}
              <div style={{ background: 'rgba(15,23,42,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '8px', fontSize: '15px' }}>1단계 공정</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>작업 전 무게 (g)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={step1Before}
                      onChange={(e) => setStep1Before(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '15px', padding: '6px 8px' }}
                    />
                  </div>
                  <span style={{ color: 'var(--text-muted)', marginTop: '14px' }}>→</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>작업 후 무게 (g)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={step1After}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStep1After(val);
                        setStep2Before(val);
                      }}
                      className="input-field"
                      style={{ width: '100%', fontSize: '15px', padding: '6px 8px' }}
                    />
                  </div>
                </div>
              </div>

              {/* 2단계 */}
              <div style={{ background: 'rgba(15,23,42,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '8px', fontSize: '15px' }}>2단계 공정</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>작업 전 무게 (g)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={step2Before}
                      onChange={(e) => setStep2Before(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '15px', padding: '6px 8px' }}
                    />
                  </div>
                  <span style={{ color: 'var(--text-muted)', marginTop: '14px' }}>→</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>작업 후 무게 (g)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={step2After}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStep2After(val);
                        setStep3Before(val);
                      }}
                      className="input-field"
                      style={{ width: '100%', fontSize: '15px', padding: '6px 8px' }}
                    />
                  </div>
                </div>
              </div>

              {/* 3단계 */}
              <div style={{ background: 'rgba(15,23,42,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '8px', fontSize: '15px' }}>3단계 공정</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>작업 전 무게 (g)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={step3Before}
                      onChange={(e) => setStep3Before(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '15px', padding: '6px 8px' }}
                    />
                  </div>
                  <span style={{ color: 'var(--text-muted)', marginTop: '14px' }}>→</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>작업 후 무게 (g)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={step3After}
                      onChange={(e) => setStep3After(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '15px', padding: '6px 8px' }}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* 하단 푸터 버튼 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
              <button 
                type="button" 
                onClick={() => setActiveWeightModalItem(null)} 
                className="btn-primary" 
                style={{ padding: '6px 14px', background: 'rgba(15,23,42,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
              >
                취소
              </button>
              <button 
                type="button" 
                onClick={handleSaveStepWeights} 
                className="btn-primary" 
                style={{ padding: '6px 16px' }}
              >
                저장 완료
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
