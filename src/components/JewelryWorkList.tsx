// src/components/JewelryWorkList.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useErpStore } from '../store/useErpStore';
import { Wrench, Printer, CheckCheck, Eye, EyeOff, X } from 'lucide-react';

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
  stepWeights?: {
    step1?: { before: number; after: number };
    step2?: { before: number; after: number };
    step3?: { before: number; after: number };
  };
}

export const JewelryWorkList: React.FC = () => {
  const { orders, catalog, updateMultipleOrderStatus, fetchDb, setActiveTab, updateItemStepWeights } = useErpStore();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [showPrice, setShowPrice] = useState<boolean>(true); // 기본값: 금액 표시 켬

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

  // 컴포넌트 마운트 시 최신 가상 DB 데이터를 강제 리로드하여 동기화
  useEffect(() => {
    fetchDb();
  }, [fetchDb]);

  // 1. 현재 '공장발주' 상태인 주문에서 가공 품목('판매' 및 '반품') 필터링하여 테이블 행 데이터 구축
  const workItems: WorkItemRow[] = [];
  
  orders.forEach(order => {
    try {
      const orderStatus = (order.status || '').trim();
      if (orderStatus === '공장발주') {
        const itemsList = order.items || [];
        itemsList.forEach((item, itemIdx) => {
          try {
            const catalogItem = catalog.find(c => c.model_number === item.model_number);
            const imageUrl = catalogItem?.images?.[0] || '';

            // 개당 공임비 (기본+추가+스톤공임)
            const baseExtra = (item.labor_base || 0) + (item.labor_extra || 0);
            const stoneLabor = ((item.labor_main || 0) * (item.qty_main || 0)) + ((item.labor_sub || 0) * (item.qty_sub || 0));
            const laborSingle = baseExtra + stoneLabor;

            workItems.push({
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
              stepWeights: item.step_weights
            });
          } catch (itemErr) {
            console.error("JewelryWorkList item mapping error:", itemErr, item);
          }
        });
      }
    } catch (orderErr) {
      console.error("JewelryWorkList order status check error:", orderErr, order);
    }
  });

  // 체크박스 제어 로직
  const isAllChecked = workItems.length > 0 && workItems.every(r => checkedItems.has(r.id));
  
  const handleToggleAll = () => {
    if (isAllChecked) {
      const next = new Set(checkedItems);
      workItems.forEach(r => next.delete(r.id));
      setCheckedItems(next);
    } else {
      const next = new Set(checkedItems);
      workItems.forEach(r => next.add(r.id));
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

  // 선택 완료 처리 (상태를 '출고대기'로 일괄 변경)
  const handleCompleteWork = () => {
    try {
      if (checkedItems.size === 0) {
        alert('완료 처리할 세공 품목을 선택해주세요.');
        return;
      }

      // 3단계 해리 무게 입력 여부 검증
      const incompleteItems: string[] = [];
      checkedItems.forEach(rowId => {
        const item = workItems.find(w => w.id === rowId);
        if (item) {
          const sw = item.stepWeights;
          const s1Before = sw?.step1?.before || 0;
          const s1After = sw?.step1?.after || 0;
          const s2Before = sw?.step2?.before || 0;
          const s2After = sw?.step2?.after || 0;
          const s3Before = sw?.step3?.before || 0;
          const s3After = sw?.step3?.after || 0;

          const isComplete = (
            s1Before > 0 && s1After > 0 &&
            s2Before > 0 && s2After > 0 &&
            s3Before > 0 && s3After > 0
          );

          if (!isComplete) {
            incompleteItems.push(`${item.customerName} - ${item.model}`);
          }
        }
      });

      if (incompleteItems.length > 0) {
        alert(`아래 품목의 단계별(1~3단계) 해리 무게가 모두 입력되지 않았습니다. 3단계까지 완료해야 출고 대기로 이동할 수 있습니다:\n\n${incompleteItems.join('\n')}`);
        return;
      }

      const orderIds = new Set<string>();
      checkedItems.forEach(rowId => {
        if (rowId.startsWith('work-item::')) {
          const parts = rowId.split('::');
          const orderId = parts[1];
          if (orderId) {
            orderIds.add(orderId);
          }
        }
      });

      if (orderIds.size === 0) {
        alert('선택한 세공 품목에서 주문 ID를 찾지 못했습니다.');
        return;
      }

      const isConfirm = window.confirm(`선택한 품목이 포함된 ${orderIds.size}건의 주문을 '세공 완료(출고 대기)' 상태로 승격시키겠습니까?`);
      if (!isConfirm) return;

      // 일괄 업데이트로 동시성 이슈 및 불필요한 fetchDb 중복 차단
      updateMultipleOrderStatus(Array.from(orderIds), '출고대기');

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

  // 개별 완료 처리 단축 버튼
  const handleSingleComplete = (orderId: string) => {
    try {
      // 3단계 해리 무게 입력 여부 검증
      const relatedItems = workItems.filter(w => w.orderId === orderId);
      const incompleteItems: string[] = [];
      
      relatedItems.forEach(item => {
        const sw = item.stepWeights;
        const s1Before = sw?.step1?.before || 0;
        const s1After = sw?.step1?.after || 0;
        const s2Before = sw?.step2?.before || 0;
        const s2After = sw?.step2?.after || 0;
        const s3Before = sw?.step3?.before || 0;
        const s3After = sw?.step3?.after || 0;

        const isComplete = (
          s1Before > 0 && s1After > 0 &&
          s2Before > 0 && s2After > 0 &&
          s3Before > 0 && s3After > 0
        );

        if (!isComplete) {
          incompleteItems.push(`모델: ${item.model}`);
        }
      });

      if (incompleteItems.length > 0) {
        alert(`단계별(1~3단계) 해리 무게가 모두 입력되지 않았습니다. 3단계까지 입력 완료해야 출고 대기로 이동할 수 있습니다:\n\n${incompleteItems.join('\n')}`);
        return;
      }

      const isConfirm = window.confirm("해당 주문 건의 세공 작업을 완료하고 출고 대기 상태로 변경하시겠습니까?");
      if (!isConfirm) return;

      // 일괄 업데이트 API 활용
      updateMultipleOrderStatus([orderId], '출고대기');
      alert('출고 대기 단계로 이동되었습니다.');
      fetchDb();

      // 출고대기 리스트 탭으로 화면 전환
      setTimeout(() => {
        setActiveTab('release_list');
      }, 50);
    } catch (err: any) {
      alert(`[개별 완료 처리 오류]\n상태 변경 중 에러가 발생했습니다:\n${err.message || err}`);
      console.error("handleSingleComplete error:", err);
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
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <h2 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Wrench size={18} style={{ color: 'var(--primary)' }} />
          <span className="gradient-text" style={{ fontFamily: 'var(--font-title)', fontWeight: '600' }}>Jewelry Workshop Manager</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>(주얼리 세공 및 작업 현황 관리대장)</span>
        </h2>
      </div>

      {/* 실시간 ERP 세공 데이터 자가진단 패널 */}
      <div className="workshop-diagnostic-panel" style={{
        padding: '10px 14px',
        background: 'rgba(212, 175, 55, 0.05)',
        border: '1px solid rgba(212, 175, 55, 0.2)',
        borderRadius: '6px',
        display: 'flex',
        gap: '24px',
        alignItems: 'center',
        fontSize: '11px',
        color: 'var(--text-main)'
      }}>
        <strong style={{ color: 'var(--primary)' }}>⚡ [실시간 세공 동기화 자가진단]</strong>
        <span>• 스토어 로드된 총 주문: <strong>{orders.length}</strong>건</span>
        <span>• '공장발주'(세공대기) 주문: <strong style={{ color: '#fbbf24' }}>{orders.filter(o => (o.status || '').trim() === '공장발주').length}</strong>건</span>
        <span>• 필터링 통과한 세공 대상 품목: <strong style={{ color: '#38bdf8' }}>{workItems.length}</strong>건</span>
        <button 
          type="button"
          onClick={() => { fetchDb(); alert('가상 DB 동기화 완료!'); }}
          style={{
            marginLeft: 'auto',
            padding: '2px 8px',
            fontSize: '10px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          데이터 강제 동기화(새로고침)
        </button>
      </div>

      {/* Control Actions Toolbar */}
      <div className="workshop-toolbar" style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: '700', color: 'var(--text-muted)', userSelect: 'none' }}>
            <input 
              type="checkbox" 
              checked={showPrice} 
              onChange={(e) => setShowPrice(e.target.checked)} 
              style={{ cursor: 'pointer' }}
            />
            {showPrice ? <Eye size={14} style={{ color: 'var(--primary)' }} /> : <EyeOff size={14} style={{ color: 'var(--text-muted)' }} />}
            인쇄 시 공임비/단가 표시
          </label>
        </div>

        {/* Action Buttons */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {checkedItems.size > 0 && (
            <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold', marginRight: '8px' }}>
              선택됨: {checkedItems.size}건
            </span>
          )}
          
          <button
            onClick={handleCompleteWork}
            className="btn-primary"
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', // 초록색 완료 테마
              color: 'var(--text-inverse)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <CheckCheck size={14} /> 세공 완료 처리 (출고대기 이동)
          </button>

          <button
            onClick={handlePrintWorkList}
            className="btn-primary"
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)',
              color: 'var(--text-inverse)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            <Printer size={14} /> 선택 품목 세공지시서 인쇄
          </button>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="table-responsive" style={{ overflowX: 'auto' }}>
        <table className="excel-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px', fontSize: '11px', tableLayout: 'fixed' }}>
          {showPrice ? (
            <colgroup>
              <col style={{ width: '3%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
            </colgroup>
          ) : (
            <colgroup>
              <col style={{ width: '3%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '5%' }} />
              <col style={{ width: '5%' }} />
            </colgroup>
          )}
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
              <th style={{ padding: '8px 4px', border: '1px solid var(--border-color)' }}>단계별 세공 무게 (해리)</th>
              {showPrice && <th style={{ padding: '8px 4px', textAlign: 'right', border: '1px solid var(--border-color)' }}>공임비</th>}
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>상태</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>작업</th>
            </tr>
          </thead>
          <tbody>
            {workItems.length > 0 ? (
              workItems.map((row, idx) => {
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
                    <td style={{ padding: '6px 4px', fontWeight: '600', verticalAlign: 'middle' }}>
                      {row.customerName}
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
                        <div style={{ width: '40px', height: '40px', margin: '0 auto', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', fontSize: '8px' }}>
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
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle', fontSize: '12px' }}>
                      {row.quantity}
                    </td>

                    {/* 스톤 세팅 스펙 */}
                    <td style={{ padding: '6px 4px', lineHeight: '1.3', verticalAlign: 'middle' }}>
                      {row.stoneMainText && <div style={{ color: 'var(--text-main)' }}>{row.stoneMainText}</div>}
                      {row.stoneSubText && <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{row.stoneSubText}</div>}
                      {!row.stoneMainText && !row.stoneSubText && <span style={{ color: 'var(--text-muted)' }}>스톤 없음</span>}
                    </td>

                    {/* 세공 비고 */}
                    <td style={{ padding: '6px 4px', verticalAlign: 'middle', color: '#fbbf24', fontWeight: 'bold' }}>
                      {row.note || '-'}
                    </td>

                    {/* 단계별 세공 무게 (손실) */}
                    <td style={{ padding: '8px 6px', verticalAlign: 'middle' }}>
                      {(() => {
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
                                  fontSize: '11px',
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

                        const pct1 = before1 > 0 ? ((loss1 / before1) * 100).toFixed(2) : '0.00';
                        const pct2 = before2 > 0 ? ((loss2 / before2) * 100).toFixed(2) : '0.00';
                        const pct3 = before3 > 0 ? ((loss3 / before3) * 100).toFixed(2) : '0.00';

                        let initialBefore = 0;
                        if (before1 > 0) initialBefore = before1;
                        else if (before2 > 0) initialBefore = before2;
                        else if (before3 > 0) initialBefore = before3;
                        const totalLossPct = initialBefore > 0 ? ((totalLoss / initialBefore) * 100).toFixed(2) : '0.00';

                        return (
                          <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px', lineHeight: '1.2' }}>
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
                                onClick={() => handleOpenWeightModal(row)}
                                style={{
                                  padding: '1px 6px',
                                  fontSize: '10px',
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

                    {/* 상태 배지 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' }}>
                        세공 작업 중
                      </span>
                    </td>

                    {/* 액션 (완료 단축버튼) */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <button
                        onClick={() => handleSingleComplete(row.orderId)}
                        className="btn-primary"
                        style={{
                          padding: '4px 8px',
                          fontSize: '10px',
                          background: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        완료
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={20} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  현재 작업실에서 진행 중인 세공 품목이 없습니다.<br />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>[주문 내역 / 명세서] 탭 대장에서 가공 품목을 체크하고 '세공리스트로 보내기' 버튼을 클릭해 작업을 개시해 주십시오.</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                <div style={{ fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '8px', fontSize: '12px' }}>1단계 공정</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>작업 전 무게 (g)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={step1Before}
                      onChange={(e) => setStep1Before(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
                    />
                  </div>
                  <span style={{ color: 'var(--text-muted)', marginTop: '14px' }}>→</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>작업 후 무게 (g)</label>
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
                      style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
                    />
                  </div>
                </div>
              </div>

              {/* 2단계 */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '8px', fontSize: '12px' }}>2단계 공정</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>작업 전 무게 (g)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={step2Before}
                      onChange={(e) => setStep2Before(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
                    />
                  </div>
                  <span style={{ color: 'var(--text-muted)', marginTop: '14px' }}>→</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>작업 후 무게 (g)</label>
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
                      style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
                    />
                  </div>
                </div>
              </div>

              {/* 3단계 */}
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '12px' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '8px', fontSize: '12px' }}>3단계 공정</div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>작업 전 무게 (g)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={step3Before}
                      onChange={(e) => setStep3Before(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
                    />
                  </div>
                  <span style={{ color: 'var(--text-muted)', marginTop: '14px' }}>→</span>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>작업 후 무게 (g)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={step3After}
                      onChange={(e) => setStep3After(e.target.value)}
                      className="input-field"
                      style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
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
        </div>,
        document.body
      )}

    </div>
  );
};
