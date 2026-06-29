// src/components/ReleaseList.tsx
import React, { useState, useEffect } from 'react';
import { useErpStore } from '../store/useErpStore';
import { Package, CheckCircle, Eye, EyeOff, X, Wrench } from 'lucide-react';

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
}

export const ReleaseList: React.FC = () => {
  const { orders, catalog, customers, updateMultipleItemsStatus, updateItemStepWeightsAndActualWeight, fetchDb, setActiveTab } = useErpStore();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [showPrice, setShowPrice] = useState<boolean>(true);

  // 세공 무게(손실) 입력을 위한 모달 상태
  const [activeWeightModalItem, setActiveWeightModalItem] = useState<any | null>(null);
  const [step1Before, setStep1Before] = useState<string>('');
  const [step1After, setStep1After] = useState<string>('');
  const [step2Before, setStep2Before] = useState<string>('');
  const [step2After, setStep2After] = useState<string>('');
  const [step3Before, setStep3Before] = useState<string>('');
  const [step3After, setStep3After] = useState<string>('');

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

  const handleSaveStepWeights = async () => {
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
    
    const actualWt = stepWeights.step3.after;
    
    // 통합 업데이트 함수 호출 (await로 처리 보장)
    await updateItemStepWeightsAndActualWeight(
      activeWeightModalItem.orderId,
      activeWeightModalItem.itemId,
      stepWeights,
      actualWt > 0 ? actualWt : undefined
    );
    
    alert('세공 손실 무게 및 실제 중량이 재계산되어 정상 반영되었습니다.');
    setActiveWeightModalItem(null);
    fetchDb();
  };

  // 컴포넌트 마운트 시 최신 데이터 동기화
  useEffect(() => {
    fetchDb();
  }, [fetchDb]);

  // 1. 현재 '출고대기' 상태인 주문에서 가공 품목('판매' 및 '반품') 필터링하여 테이블 행 구축
  const releaseItems = React.useMemo(() => {
    const items: ReleaseItemRow[] = [];

    orders.forEach(order => {
      try {
        const itemsList = order.items || [];
        itemsList.forEach((item, itemIdx) => {
          try {
            const itemStatus = item.status || order.status || '접수';
            if (itemStatus !== '출고대기') return;

            const catalogItem = catalog.find(c => c.model_number === item.model_number);
            const imageUrl = catalogItem?.images?.[0] || '';

            // 개당 공임비 (기본+추가+스톤공임)
            const baseExtra = (item.labor_base || 0) + (item.labor_extra || 0);
            const stoneLabor = ((item.labor_main || 0) * (item.qty_main || 0)) + ((item.labor_sub || 0) * (item.qty_sub || 0));
            const laborSingle = baseExtra + stoneLabor;

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
              stepWeights: item.step_weights
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
  }, [orders, catalog]);

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

  // 개별 세공작업(공장발주) 되돌리기
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

      {/* 실시간 출고 동기화 자가진단 패널 */}
      <div className="release-diagnostic-panel" style={{
        padding: '10px 14px',
        background: 'rgba(212, 175, 55, 0.05)',
        border: '1px solid rgba(212, 175, 55, 0.2)',
        borderRadius: '6px',
        display: 'flex',
        gap: '24px',
        alignItems: 'center',
        fontSize: '14px',
        color: 'var(--text-main)'
      }}>
        <strong style={{ color: 'var(--primary)' }}>⚡ [실시간 출고 동기화 자가진단]</strong>
        <span>• 스토어 로드된 총 주문: <strong>{orders.length}</strong>건</span>
        <span>• '출고대기'(세공완료) 주문: <strong style={{ color: '#10b981' }}>{orders.filter(o => (o.status || '').trim() === '출고대기').length}</strong>건</span>
        <span>• 출고 대기 품목 수: <strong style={{ color: '#38bdf8' }}>{releaseItems.length}</strong>건</span>
        <button 
          type="button"
          onClick={() => { fetchDb(); alert('가상 DB 동기화 완료!'); }}
          className="release-refresh-btn"
          style={{
            marginLeft: 'auto',
            padding: '2px 8px',
            fontSize: '13px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          데이터 새로고침
        </button>
      </div>

      {/* Control Actions Toolbar */}
      <div className="release-action-toolbar" style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '700', color: 'var(--text-muted)', userSelect: 'none' }}>
            <input 
              type="checkbox" 
              checked={showPrice} 
              onChange={(e) => setShowPrice(e.target.checked)} 
              style={{ cursor: 'pointer' }}
            />
            {showPrice ? <Eye size={14} style={{ color: 'var(--primary)' }} /> : <EyeOff size={14} style={{ color: 'var(--text-muted)' }} />}
            금액/공임 정보 노출
          </label>
        </div>

        {/* Action Buttons */}
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
        <table className="excel-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px', fontSize: '14px', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '3%' }} />
            <col style={{ width: '3%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '3%' }} />
            <col style={{ width: '3%' }} />
            <col style={{ width: '3%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '16%' }} />
            {showPrice && <col style={{ width: '5%' }} />}
            {showPrice && <col style={{ width: '6%' }} />}
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
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
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>제품 사진</th>
              <th style={{ padding: '8px 4px', border: '1px solid var(--border-color)' }}>모델번호</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>재질</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>색상</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>사이즈</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>수량</th>
              <th style={{ padding: '8px 4px', border: '1px solid var(--border-color)' }}>스톤 세팅 스펙</th>
              <th style={{ padding: '8px 4px', border: '1px solid var(--border-color)' }}>세공 요청사항 (비고)</th>
              <th style={{ padding: '8px 4px', border: '1px solid var(--border-color)' }}>세공 해리 (혜리)</th>
              {showPrice && <th style={{ padding: '8px 4px', textAlign: 'right', border: '1px solid var(--border-color)' }}>공임비</th>}
              {showPrice && <th style={{ padding: '8px 4px', textAlign: 'right', border: '1px solid var(--border-color)' }}>합계</th>}
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>상태</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {releaseItems.length > 0 ? (
              releaseItems.map((row, idx) => {
                return (
                  <tr 
                    key={row.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)'
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

                    {/* 거래처 */}
                    <td style={{ padding: '6px 4px', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: '600' }}>{row.customerName}</div>
                      {(() => {
                        const cust = customers.find(c => c.customer_id === row.customerId);
                        if (!cust) return null;
                        return (
                          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.1' }}>
                            미수: {cust.receivable_amount.toLocaleString()}원 / 금: {cust.gold_balance_24k_g.toFixed(2)}g
                          </div>
                        );
                      })()}
                    </td>

                    {/* 이미지 썸네일 */}
                    <td style={{ padding: '4px', textAlign: 'center', verticalAlign: 'middle' }}>
                      {row.imageUrl ? (
                        <img 
                          src={row.imageUrl} 
                          alt={row.model} 
                          style={{ maxWidth: '50px', maxHeight: '50px', objectFit: 'contain', borderRadius: '4px', display: 'block', margin: '0 auto', border: '1px solid var(--border-color)' }}
                        />
                      ) : (
                        <div style={{ width: '40px', height: '40px', margin: '0 auto', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                          No Image
                        </div>
                      )}
                    </td>

                    {/* 모델 */}
                    <td style={{ padding: '6px 4px', fontWeight: '700', color: '#38bdf8', verticalAlign: 'middle' }}>
                      {row.model}
                    </td>

                    {/* 재질 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>
                      {row.material}
                    </td>

                    {/* 색상 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                      {row.color}
                    </td>

                    {/* 사이즈 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>
                      {row.size || '-'}
                    </td>

                    {/* 수량 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle', fontSize: '15px' }}>
                      {row.quantity}
                    </td>

                    {/* 스톤 세팅 스펙 */}
                    <td style={{ padding: '6px 4px', lineHeight: '1.3', verticalAlign: 'middle' }}>
                      {row.stoneMainText && <div style={{ color: 'var(--text-main)' }}>{row.stoneMainText}</div>}
                      {row.stoneSubText && <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{row.stoneSubText}</div>}
                      {!row.stoneMainText && !row.stoneSubText && <span style={{ color: 'var(--text-muted)' }}>스톤 없음</span>}
                    </td>

                    {/* 비고 */}
                    <td style={{ padding: '6px 4px', verticalAlign: 'middle', color: '#fbbf24', fontWeight: 'bold' }}>
                      {row.note || '-'}
                    </td>

                    {/* 세공 손실 (혜리) */}
                    <td style={{ padding: '8px 6px', verticalAlign: 'middle', color: 'var(--text-main)' }}>
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
                                type="button"
                                onClick={() => handleOpenWeightModal(row)}
                                className="btn-primary"
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '14px',
                                  background: 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)',
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

                        const before1 = sw.step1?.before || 0;
                        const after1 = sw.step1?.after || 0;
                        const before2 = sw.step2?.before || 0;
                        const after2 = sw.step2?.after || 0;
                        const before3 = sw.step3?.before || 0;
                        const after3 = sw.step3?.after || 0;

                        const loss1 = parseFloat(Math.max(0, before1 - after1).toFixed(2));
                        const loss2 = parseFloat(Math.max(0, before2 - after2).toFixed(2));
                        const loss3 = parseFloat(Math.max(0, before3 - after3).toFixed(2));
                        const totalLoss = parseFloat((loss1 + loss2 + loss3).toFixed(2));

                        const pct1 = before1 > 0 ? ((loss1 / before1) * 100).toFixed(2) : '0.00';
                        const pct2 = before2 > 0 ? ((loss2 / before2) * 100).toFixed(2) : '0.00';
                        const pct3 = before3 > 0 ? ((loss3 / before3) * 100).toFixed(2) : '0.00';

                        let initialBefore = 0;
                        if (before1 > 0) initialBefore = before1;
                        else if (before2 > 0) initialBefore = before2;
                        else if (before3 > 0) initialBefore = before3;
                        const totalLossPct = initialBefore > 0 ? ((totalLoss / initialBefore) * 100).toFixed(2) : '0.00';

                        return (
                          <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '3px', lineHeight: '1.2' }}>
                            {before1 > 0 || after1 > 0 ? (
                              <div>1단계: {before1.toFixed(2)}g → {after1.toFixed(2)}g (해리 {loss1.toFixed(2)}g / {pct1}%)</div>
                            ) : null}
                            {before2 > 0 || after2 > 0 ? (
                              <div>2단계: {before2.toFixed(2)}g → {after2.toFixed(2)}g (해리 {loss2.toFixed(2)}g / {pct2}%)</div>
                            ) : null}
                            {before3 > 0 || after3 > 0 ? (
                              <div>3단계: {before3.toFixed(2)}g → {after3.toFixed(2)}g (해리 {loss3.toFixed(2)}g / {pct3}%)</div>
                            ) : null}
                            <div style={{ 
                              fontWeight: 'bold', 
                              color: 'var(--primary)', 
                              borderTop: '1px solid rgba(255,255,255,0.08)', 
                              paddingTop: '3px', 
                              marginTop: '2px', 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center' 
                            }}>
                              <span>총 해리: {totalLoss.toFixed(2)}g ({totalLossPct}%)</span>
                              <button
                                type="button"
                                onClick={() => handleOpenWeightModal(row)}
                                style={{
                                  padding: '1px 6px',
                                  fontSize: '13px',
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '3px',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  marginLeft: '4px'
                                }}
                              >
                                수정
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* 공임비 */}
                    {showPrice && (
                      <td style={{ padding: '6px 4px', textAlign: 'right', verticalAlign: 'middle' }}>
                        {row.laborSingle.toLocaleString()}원
                      </td>
                    )}

                    {/* 합계 */}
                    {showPrice && (
                      <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: '700', verticalAlign: 'middle' }}>
                        {row.totalAmount.toLocaleString()}원
                      </td>
                    )}

                    {/* 상태 배지 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '3px 8px', borderRadius: '12px', fontSize: '13px', fontWeight: 'bold' }}>
                        출고 대기
                      </span>
                    </td>

                    {/* 액션 (세공작업 되돌리기 버튼) */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <button
                        type="button"
                        onClick={() => handleRevertToWork(row.orderId, row.itemId)}
                        className="btn-primary"
                        style={{
                          padding: '4px 8px',
                          fontSize: '13px',
                          background: 'rgba(245, 158, 11, 0.1)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
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
                <td colSpan={20} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>
                  현재 출고 대기 중인 세공완료 품목이 없습니다.<br />
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>[주얼리 세공리스트] 탭에서 작업을 완료하시면 이곳으로 품목이 이동되어 최종 출고 처리를 진행할 수 있습니다.</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 세공 무게 입력/수정 모달 */}
      {activeWeightModalItem && (
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
          <div className="glass-panel" style={{
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
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
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
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
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
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
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
                style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
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
        </div>
      )}

    </div>
  );
};
