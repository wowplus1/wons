// src/components/ReleaseList.tsx
import React, { useState, useEffect } from 'react';
import { useErpStore, getCatalogLaborFees } from '../store/useErpStore';
import { Package, CheckCircle } from 'lucide-react';

interface ReleaseItemRow {
  id: string; // `release-item::${order_id}::${item_id}::${itemIdx}`
  orderId: string;
  orderDate: string;
  customerName: string;
  customerId: string;
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
  actualWeightG?: number;
  division?: string;
  stepWeights?: any;

  buyPrice: number;
  laborBaseExtra: number;
  laborMainSub: number;
  stonesCountTotal: number;
  goldWeightG: number;
  stonesWeightTotal: number;
}

export const ReleaseList: React.FC = () => {
  const { orders, catalog, stones, updateMultipleItemsStatus, fetchDb, setActiveTab } = useErpStore();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // 컴포넌트 마운트 시 최신 데이터 동기화
  useEffect(() => {
    fetchDb();
  }, [fetchDb]);

  // 1. 현재 '출고대기' 상태인 주문에서 가공 품목 필터링하여 테이블 행 구축
  const releaseItems = React.useMemo(() => {
    const items: ReleaseItemRow[] = [];

    orders.forEach(order => {
      try {
        const itemsList = order.items || [];
        itemsList.forEach((item, itemIdx) => {
          try {
            const itemStatus = item.status || order.status || '접수';
            if (itemStatus !== '출고대기') return;

            const normModel = (m: string) => (m || '').replace(/\s+/g, '').toUpperCase();
            const catalogItem = catalog.find(c => normModel(c.model_number) === normModel(item.model_number));
            const imageUrl = catalogItem?.images?.[0] || '';

            // 개당 공임비 (기본+추가+스톤공임)
            const baseExtra = (item.labor_base || 0) + (item.labor_extra || 0);
            const stoneLabor = ((item.labor_main || 0) * (item.qty_main || 0)) + ((item.labor_sub || 0) * (item.qty_sub || 0));
            const laborSingle = baseExtra + stoneLabor;

            // 공임단가 세부 계산
            const laborBaseExtra = (item.labor_base || 0) + (item.labor_extra || 0);
            const laborMainSub = (item.labor_main || 0) + (item.labor_sub || 0);

            // 알수합계
            const stonesCountTotal = (item.qty_main || 0) + (item.qty_sub || 0);

            // 중량(스톤)
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

            // 스톤 구매단가 합계 계산
            let totalStonePurchaseCost = 0;
            if (catalogItem && catalogItem.default_stones && catalogItem.default_stones.length > 0) {
              catalogItem.default_stones.forEach(ds => {
                const stone = stones.find(s => s.stone_id === ds.stone_id);
                const purchasePrice = stone?.purchase_price || 0;
                totalStonePurchaseCost += ds.quantity * purchasePrice;
              });
            } else {
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
              id: `release-item::${order.order_id}::${item.item_id}::${itemIdx}`,
              orderId: order.order_id,
              orderDate: order.order_date,
              customerName: order.customer_snapshot?.name || '알수없음',
              customerId: order.customer_snapshot?.customer_id || '',
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
              actualWeightG: item.actual_weight_g,
              division: item.division,
              stepWeights: item.step_weights,
              
              buyPrice: finalLaborCost,
              laborBaseExtra,
              laborMainSub,
              stonesCountTotal,
              goldWeightG: item.gold_weight || 0,
              stonesWeightTotal
            });
          } catch (itemErr) {
            console.error("ReleaseList item mapping error:", itemErr, item);
          }
        });
      } catch (orderErr) {
        console.error("ReleaseList order status check error:", orderErr, order);
      }
    });

    return items;
  }, [orders, catalog, stones]);

  // 체크박스 제어
  const isAllChecked = releaseItems.length > 0 && releaseItems.every(r => checkedItems.has(r.id));

  const handleToggleAll = () => {
    if (isAllChecked) {
      const next = new Set(checkedItems);
      releaseItems.forEach(r => next.delete(r.id));
      setCheckedItems(next);
    } else {
      const next = new Set(checkedItems);
      releaseItems.forEach(r => next.add(r.id));
      setCheckedItems(next);
    }
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

  // 일괄 출고 완료
  const handleCompleteRelease = async () => {
    try {
      if (checkedItems.size === 0) {
        alert('출고 처리할 품목을 선택해주세요.');
        return;
      }

      const updates: { orderId: string, itemId: number }[] = [];
      checkedItems.forEach(rowId => {
        if (rowId.startsWith('release-item::')) {
          const parts = rowId.split('::');
          const orderId = parts[1];
          const itemId = Number(parts[2]);
          if (orderId && !isNaN(itemId)) {
            updates.push({ orderId, itemId });
          }
        }
      });

      if (updates.length === 0) {
        alert('선택한 품목 정보를 찾지 못했습니다.');
        return;
      }

      const isConfirm = window.confirm(`선택한 ${updates.length}개 품목을 '출고 완료' 상태로 변경하시겠습니까?`);
      if (!isConfirm) return;

      await updateMultipleItemsStatus(updates, '출고완료');
      alert('선택한 품목들이 최종 출고 완료 처리되었습니다.');
      setCheckedItems(new Set());
      fetchDb();

      // 미수 대장 탭으로 화면 전환
      setTimeout(() => {
        setActiveTab('unpaid_ledger');
      }, 50);
    } catch (err: any) {
      alert(`[출고 완료 처리 오류]\n상태 변경 중 에러가 발생했습니다:\n${err.message || err}`);
      console.error("handleCompleteRelease error:", err);
    }
  };

  // 개별 세공작업 되돌리기
  const handleRevertToWork = async (orderId: string, itemId: number) => {
    try {
      const isConfirm = window.confirm("선택하신 품목을 '세공 작업(공장발주)' 상태로 되돌리시겠습니까?\n되돌린 후 주얼리 세공리스트로 자동 이동합니다.");
      if (!isConfirm) return;

      await updateMultipleItemsStatus([{ orderId, itemId }], '공장발주');
      alert('세공 작업 상태로 복구되었습니다.');
      fetchDb();

      // 주얼리 세공리스트 탭으로 화면 전환
      setTimeout(() => {
        setActiveTab('work_list');
      }, 50);
    } catch (err: any) {
      alert(`[되돌리기 오류]\n에러가 발생했습니다:\n${err.message || err}`);
      console.error("handleRevertToWork error:", err);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <h2 style={{ fontSize: '19px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={18} style={{ color: 'var(--primary)' }} />
          <span className="gradient-text" style={{ fontFamily: 'var(--font-title)', fontWeight: '600' }}>Release Management Center</span>
          <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>(주얼리 세공완료 출고 대기 대장)</span>
        </h2>
      </div>

      {/* Control Actions Toolbar */}
      <div className="release-action-toolbar" style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          출고할 품목을 체크하신 후 오른쪽의 '출고 완료 처리' 버튼을 누르시면 매출 장부에 반영됩니다.
        </div>
        <div className="release-action-group" style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {checkedItems.size > 0 && (
            <span style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 'bold', marginRight: '8px' }}>
              선택됨: {checkedItems.size}건
            </span>
          )}
          
          <button
            onClick={handleCompleteRelease}
            className="btn-primary"
            style={{
              padding: '6px 14px',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'var(--text-inverse)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <CheckCircle size={14} /> 선택 품목 출고 완료 처리 (장부 확정)
          </button>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="table-responsive" style={{ overflowX: 'auto' }}>
        <table className="excel-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1350px', fontSize: '14px', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '3%' }} /> {/* checkbox */}
            <col style={{ width: '3%' }} /> {/* No */}
            <col style={{ width: '5%' }} /> {/* 의뢰일 */}
            <col style={{ width: '8%' }} /> {/* 거래처 */}
            <col style={{ width: '8%' }} /> {/* 모델 */}
            <col style={{ width: '4%' }} /> {/* 재질 */}
            <col style={{ width: '3%' }} /> {/* 색상 */}
            <col style={{ width: '10%' }} /> {/* 비고 */}
            <col style={{ width: '6%' }} /> {/* 중량(금) */}
            <col style={{ width: '6%' }} /> {/* 중량(스톤) */}
            <col style={{ width: '8%' }} /> {/* 구매단가 */}
            <col style={{ width: '8%' }} /> {/* 공임단가(기본+추가) */}
            <col style={{ width: '8%' }} /> {/* 공임단가(중심+보조) */}
            <col style={{ width: '5%' }} /> {/* 알수 */}
            <col style={{ width: '4%' }} /> {/* 수량 */}
            <col style={{ width: '6%' }} /> {/* 합계 */}
            <col style={{ width: '5%' }} /> {/* 되돌리기 */}
          </colgroup>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
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
              <th style={{ padding: '8px 4px', border: '1px solid var(--border-color)' }}>거래처</th>
              <th style={{ padding: '8px 4px', border: '1px solid var(--border-color)' }}>모델</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>재질</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>색상</th>
              <th style={{ padding: '8px 4px', border: '1px solid var(--border-color)' }}>비고</th>
              <th style={{ padding: '8px 4px', textAlign: 'right', border: '1px solid var(--border-color)' }}>중량(금)</th>
              <th style={{ padding: '8px 4px', textAlign: 'right', border: '1px solid var(--border-color)' }}>중량(스톤)</th>
              <th style={{ padding: '8px 4px', textAlign: 'right', border: '1px solid var(--border-color)' }}>구매단가</th>
              <th style={{ padding: '8px 4px', textAlign: 'right', border: '1px solid var(--border-color)' }}>공임단가(기본+추가)</th>
              <th style={{ padding: '8px 4px', textAlign: 'right', border: '1px solid var(--border-color)' }}>공임단가(중심+보조)</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>알수</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>수량</th>
              <th style={{ padding: '8px 4px', textAlign: 'right', border: '1px solid var(--border-color)' }}>합계</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>되돌리기</th>
            </tr>
          </thead>
          <tbody>
            {releaseItems.length > 0 ? (
              releaseItems.map((row, idx) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)' }}>
                  <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <input type="checkbox" checked={checkedItems.has(row.id)} onChange={() => handleToggleRow(row.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={{ padding: '6px 4px', textAlign: 'center', color: 'var(--text-muted)', verticalAlign: 'middle' }}>{idx + 1}</td>
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
                  <td style={{ padding: '6px 4px', verticalAlign: 'middle', fontWeight: 'bold' }}>{row.customerName}</td>
                  <td style={{ padding: '6px 4px', verticalAlign: 'middle', fontWeight: '700', color: '#38bdf8' }}>{row.model}</td>
                  <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>{row.material}</td>
                  <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>{row.color}</td>
                  <td style={{ padding: '6px 4px', verticalAlign: 'middle', color: '#fbbf24', fontWeight: 'bold' }}>{row.note || '-'}</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 'bold' }}>{row.goldWeightG > 0 ? `${row.goldWeightG.toFixed(2)}g` : '-'}</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', verticalAlign: 'middle', color: 'var(--text-muted)' }}>{row.stonesWeightTotal > 0 ? `${row.stonesWeightTotal.toFixed(3)}g` : '-'}</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 'bold', color: '#10b981' }}>{row.buyPrice.toLocaleString()}원</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', verticalAlign: 'middle', color: 'var(--text-main)' }}>{row.laborBaseExtra.toLocaleString()}원</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', verticalAlign: 'middle', color: 'var(--text-main)' }}>{row.laborMainSub.toLocaleString()}원</td>
                  <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>{row.stonesCountTotal}알</td>
                  <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle', fontSize: '15px' }}>{row.quantity}</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: '700', verticalAlign: 'middle' }}>{row.totalAmount.toLocaleString()}원</td>
                  <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <button type="button" onClick={() => handleRevertToWork(row.orderId, row.itemId)} style={{ padding: '4px 8px', fontSize: '13px', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '4px', cursor: 'pointer' }}>되돌리기</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={17} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>
                  현재 출고 대기 중인 세공완료 품목이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
