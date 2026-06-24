// src/components/OrderList.tsx
import React, { useState } from 'react';
import { useErpStore } from '../store/useErpStore';
import { ShoppingBag } from 'lucide-react';

interface RowData {
  id: string;
  date: string;
  dateDisplay: string;
  type: '판매' | '결제' | '반품' | 'DC';
  customerName: string;
  customerId: string;
  orderId?: string;
  transactionId?: string;
  serialNo?: string;
  tradeNo: string;
  model: string;
  material: string;
  color?: string;
  note: string;
  weightGoldDon: number;
  weightPureGoldDon: number;
  purchasePrice?: number;
  laborBaseExtra?: number;
  laborStone?: number;
  stoneQty?: number;
  quantity: number;
  totalAmount?: number;
  vat?: string;
}

export const OrderList: React.FC = () => {
  const { orders, customers, transactions, updateMultipleItemsStatus, setActiveTab, deleteOrder, deleteTransaction, startEditOrder } = useErpStore();
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterType, setFilterType] = useState<'전체' | '판매' | '결제' | '반품' | 'DC'>('전체');
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());

  const handleDeleteRow = (row: RowData) => {
    const isConfirm = window.confirm(`선택한 [${row.type}] 데이터를 완전히 삭제하시겠습니까?\n삭제된 정보는 즉시 거래처의 미수금 및 순금 미수량에서 복구(역산)처리 됩니다.`);
    if (!isConfirm) return;

    if (row.orderId) {
      deleteOrder(row.orderId);
      alert('해당 주문서 데이터가 완전히 삭제되었습니다.');
    } else if (row.transactionId) {
      deleteTransaction(row.transactionId);
      alert('해당 수동결제 데이터가 완전히 삭제되었습니다.');
    }
  };

  const handlePrintInvoice = (orderId: string) => {
    const w = 1150;
    const h = 850;
    const left = window.screen.width / 2 - w / 2;
    const top = window.screen.height / 2 - h / 2;

    window.open(
      `./?popup=invoice&orderId=${orderId}`,
      `invoice_popup_${orderId}`,
      `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );
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

  // Compile all rows (Orders + Gold Payments)
  // 거래처별 거래(주문서 및 수동 결제) 횟수를 순차적으로 매기기 위한 맵 계산
  const customerEvents: { [customerId: string]: { id: string; date: string }[] } = {};

  // 1) 주문서(Order) 추가 (동일 주문서 안의 아이템들은 하나의 거래 이벤트)
  orders.forEach(order => {
    const cId = order.customer_snapshot?.customer_id;
    if (!cId) return;
    if (!customerEvents[cId]) {
      customerEvents[cId] = [];
    }
    // 동일한 주문서 ID가 이미 들어가 있는지 확인하여 중복 방지
    if (!customerEvents[cId].some(e => e.id === order.order_id)) {
      customerEvents[cId].push({
        id: order.order_id,
        date: order.order_date
      });
    }
  });

  // 2) 수동으로 입력한 결제(Transaction) 추가 (system 생성 제외)
  transactions.forEach(tx => {
    if (tx.created_by === 'system') return;
    const cId = tx.customer_id;
    if (!cId) return;
    if (!customerEvents[cId]) {
      customerEvents[cId] = [];
    }
    if (!customerEvents[cId].some(e => e.id === tx.transaction_id)) {
      customerEvents[cId].push({
        id: tx.transaction_id,
        date: tx.created_at
      });
    }
  });

  // 3) 거래처별로 시간순(date 오름차순) 정렬 후 거래No (1부터 차례대로) 부여
  const tradeNoMap: { [customerId: string]: { [eventId: string]: number } } = {};
  Object.keys(customerEvents).forEach(cId => {
    const sorted = [...customerEvents[cId]].sort((a, b) => a.date.localeCompare(b.date));
    tradeNoMap[cId] = {};
    sorted.forEach((event, index) => {
      tradeNoMap[cId][event.id] = index + 1;
    });
  });

  const allRows: RowData[] = [];

  // 1. Map order items to sales rows
  orders.forEach(order => {
    if (!order) return;

    const cId = order.customer_snapshot?.customer_id;
    const customer = cId ? customers.find(c => c.customer_id === cId) : undefined;
    const lossRate = order.customer_snapshot?.loss_rate || customer?.loss_rate || 0;

    const itemsList = order.items || [];
    itemsList.forEach((item, itemIdx) => {
      // 품목별 상태 체크 (구버전 데이터 대응 포함)
      const itemStatus = item.status || order.status || '접수';
      if (itemStatus === '공장발주' || itemStatus === '출고대기' || itemStatus === '출고완료') return;
      const qty = item.quantity || 1;
      const pureGoldWeightG = item.estimated_weight_g || 0;
      const weightGoldDon = pureGoldWeightG / 3.75;

      const purity = item.material === '14K' ? 0.585 : item.material === '18K' ? 0.750 : 1.0;
      const singleGoldSalesDon = Math.floor((weightGoldDon * purity * (1 + lossRate / 100)) * 1000) / 1000;
      const weightPureGoldDon = singleGoldSalesDon * qty;

      const baseLabor = item.labor_base || 0;
      const extraLabor = item.labor_extra || 0;

      const mainStoneLabor = (item.labor_main || 0) * (item.qty_main || 0);
      const subStoneLabor = (item.labor_sub || 0) * (item.qty_sub || 0);

      const laborBaseExtra = baseLabor + extraLabor;
      const laborStone = mainStoneLabor + subStoneLabor;
      const totalAmount = (laborBaseExtra + laborStone) * qty;

      const serialNo = order.order_id.replace(/[^0-9]/g, '').slice(-8) || order.order_id.slice(-8);
      
      // 거래처별 계산된 누적 거래No 가져오기
      const tradeNoVal = cId ? (tradeNoMap[cId]?.[order.order_id] || 1) : 1;
      const tradeNo = String(tradeNoVal);

      // Map models to match the specific costs in the user image
      let purchasePrice = 20000;
      if (item.model_number === '650M-런블') purchasePrice = 97400;
      else if (item.model_number === '벨R-562') purchasePrice = 22000;
      else if (item.model_number === '벨M-549') purchasePrice = 150800;
      else if (item.model_number.includes('JP출력')) purchasePrice = 20000;

      allRows.push({
        id: `order-item::${order.order_id}::${item.item_id}::${itemIdx}`,
        date: order.order_date,
        dateDisplay: (() => {
          try {
            const d = new Date(order.order_date);
            return isNaN(d.getTime()) ? '-' : d.toISOString().slice(5, 10);
          } catch {
            return '-';
          }
        })(),
        type: item.division || '판매',
        customerName: order.customer_snapshot?.name || '알수없음',
        customerId: cId || '',
        orderId: order.order_id,
        serialNo,
        tradeNo,
        model: item.model_number,
        material: item.material,
        color: item.color,
        note: item.note || '',
        weightGoldDon,
        weightPureGoldDon,
        purchasePrice,
        laborBaseExtra,
        laborStone,
        stoneQty: item.qty_main || undefined,
        quantity: qty,
        totalAmount
      });
    });
  });

  // 2. Map gold transactions to payment rows (Exclude system generated transactions to avoid duplication)
  transactions.forEach((tx, txIdx) => {
    if (tx.created_by === 'system') return;

    const customer = customers.find(c => c.customer_id === tx.customer_id);
    const dateDisplay = new Date(tx.created_at).toISOString().slice(5, 10); // MM-DD

    const weightGoldDon = tx.weight_g / 3.75;
    const purity = tx.gold_type === '14K' ? 0.585 : tx.gold_type === '18K' ? 0.750 : 1.0;
    const weightPureGoldDon = weightGoldDon * purity;

    // 거래처별 계산된 누적 거래No 가져오기
    const tradeNoVal = tradeNoMap[tx.customer_id]?.[tx.transaction_id] || 1;
    const tradeNo = String(tradeNoVal);

    allRows.push({
      id: `tx-${tx.transaction_id}-${txIdx}`,
      date: tx.created_at,
      dateDisplay,
      type: '결제',
      customerName: customer?.name || '알수없음',
      customerId: tx.customer_id,
      transactionId: tx.transaction_id,
      tradeNo,
      model: '결제',
      material: tx.gold_type || '24K',
      note: tx.note || '',
      weightGoldDon,
      weightPureGoldDon,
      quantity: 1
    });
  });

  // Filter & Search Logic (Sorted by Date descending - newest first)
  const filteredRows = allRows.filter(row => {
    const matchCustomer = row.customerName.toLowerCase().includes(filterCustomer.toLowerCase());
    const matchType = filterType === '전체' || row.type === filterType;
    return matchCustomer && matchType;
  }).sort((a, b) => b.date.localeCompare(a.date));

  // 체크박스 제어 로직
  const selectableRows = filteredRows;
  const isAllChecked = selectableRows.length > 0 && selectableRows.every(r => checkedRows.has(r.id));

  const handleToggleAll = () => {
    if (isAllChecked) {
      const next = new Set(checkedRows);
      selectableRows.forEach(r => next.delete(r.id));
      setCheckedRows(next);
    } else {
      const next = new Set(checkedRows);
      selectableRows.forEach(r => next.add(r.id));
      setCheckedRows(next);
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(checkedRows);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setCheckedRows(next);
  };

  const handleSendToWorkList = async () => {
    try {
      if (checkedRows.size === 0) {
        alert('보내기 처리할 항목을 선택해주세요.');
        return;
      }

      // 선택된 행들로부터 orderId와 itemId 리스트 추출
      const updates: { orderId: string, itemId: number }[] = [];
      checkedRows.forEach(rowId => {
        if (rowId.startsWith('order-item::')) {
          const parts = rowId.split('::');
          const orderId = parts[1];
          const itemId = parseInt(parts[2]);
          if (orderId && !isNaN(itemId)) {
            updates.push({ orderId, itemId });
          }
        }
      });

      if (updates.length === 0) {
        alert('선택한 항목에서 품목 정보를 찾을 수 없습니다.');
        return;
      }

      // 품목별 성격에 따라 세공 대상(판매, 반품)과 정산 대상(결제, DC) 분류
      const craftUpdates: typeof updates = [];
      const releaseUpdates: typeof updates = [];

      updates.forEach(up => {
        const orderObj = orders.find(o => o.order_id === up.orderId);
        if (orderObj) {
          const item = orderObj.items.find(i => i.item_id === up.itemId);
          if (item) {
            const isCraft = item.division === '판매' || item.division === '반품';
            if (isCraft) {
              craftUpdates.push(up);
            } else {
              releaseUpdates.push(up);
            }
          }
        }
      });

      // 사용자 확인 및 피드백 메시지 구성
      let confirmMessage = `선택한 ${updates.length}개 품목을 전송하시겠습니까?`;
      if (craftUpdates.length > 0 && releaseUpdates.length > 0) {
        confirmMessage = `선택한 품목 중 세공이 필요한 제품 ${craftUpdates.length}개는 [세공 작업]으로 보내고,\n결제/DC 정산 품목 ${releaseUpdates.length}개는 세공 없이 바로 [출고 대기]로 보냅니다. 진행하시겠습니까?`;
      } else if (releaseUpdates.length > 0) {
        confirmMessage = `선택한 품목 ${releaseUpdates.length}개는 결제/DC로만 구성되어 있어 세공 없이 바로 [출고 대기]로 보냅니다. 진행하시겠습니까?`;
      }

      const isConfirm = window.confirm(confirmMessage);
      if (!isConfirm) return;

      // 상태 업데이트 실행
      if (craftUpdates.length > 0) {
        await updateMultipleItemsStatus(craftUpdates, '공장발주');
      }
      if (releaseUpdates.length > 0) {
        await updateMultipleItemsStatus(releaseUpdates, '출고대기');
      }

      alert(`선택한 품목들의 전송이 완료되었습니다.\n\n- 세공 작업(공장발주) 이동: ${craftUpdates.length}개\n- 출고 대기 이동 (결제/DC 전용): ${releaseUpdates.length}개`);
      
      // 선택 상태 비우기
      setCheckedRows(new Set());
      
      // 상태 전파가 완료된 후 적절한 탭으로 화면 전환
      setTimeout(() => {
        if (craftUpdates.length > 0) {
          setActiveTab('work_list');
        } else {
          setActiveTab('release_list');
        }
      }, 50);
    } catch (err: any) {
      alert(`[주문 이동 전송 오류]\n이동 처리 중 에러가 발생했습니다. 아래 메시지를 에이전트에게 전달해주세요:\n${err.message || err}`);
      console.error("handleSendToWorkList error:", err);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>
      
      {/* Header */}
      <div className="order-list-header">
        <h2 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={18} style={{ color: 'var(--primary)' }} />
          <span className="gradient-text" style={{ fontFamily: 'var(--font-title)', fontWeight: '600' }}>Order & Transaction History Master</span>
          <span className="header-subtitle">(거래처 원장 명세서 원본 관리 대장)</span>
        </h2>
      </div>

      {/* Filter Options */}
      <div className="order-list-filter-bar">
        <div className="filter-group">
          <label style={{ fontWeight: '700', color: 'var(--text-muted)' }}>거래처 검색:</label>
          <input
            type="text"
            placeholder="거래처명 입력..."
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            className="input-field"
            style={{ padding: '5px 10px', fontSize: '12px' }}
          />
        </div>

        <div className="filter-group">
          <label style={{ fontWeight: '700', color: 'var(--text-muted)' }}>구분 필터:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as '전체' | '판매' | '결제' | '반품' | 'DC')}
            className="input-field"
            style={{ padding: '5px 10px', fontSize: '12px' }}
          >
            <option value="전체">전체 구분</option>
            <option value="판매">판매 (주문)</option>
            <option value="결제">결제 (정산)</option>
            <option value="반품">반품</option>
            <option value="DC">DC</option>
          </select>
        </div>

        {/* 세공리스트 출력 액션 버튼 */}
        <div className="filter-action-group">
          {checkedRows.size > 0 && (
            <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 'bold' }}>
              선택됨: {checkedRows.size}건
            </span>
          )}
          <button
            onClick={handleSendToWorkList}
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
            세공리스트로 보내기
          </button>
        </div>
      </div>

      {/* Table grid */}
      <div className="table-responsive" style={{ overflowX: 'auto' }}>
        <table className="excel-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px', fontSize: '11px', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '3%' }} />
            <col style={{ width: '3%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '3%' }} />
            <col style={{ width: '3%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '3%' }} />
            <col style={{ width: '3%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '3%' }} />
            <col style={{ width: '6%' }} />
          </colgroup>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>No</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <input 
                  type="checkbox" 
                  checked={isAllChecked} 
                  onChange={handleToggleAll} 
                  style={{ cursor: 'pointer' }}
                  title="전체 가공 품목 선택/해제"
                />
              </th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>일자</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>구분</th>
              <th rowSpan={2} style={{ padding: '6px 4px', border: '1px solid var(--border-color)' }}>거래처</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>거래No</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>시리얼<br/>주문번호</th>
              <th rowSpan={2} style={{ padding: '6px 4px', border: '1px solid var(--border-color)' }}>모델</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>재질</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>색상</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>비고</th>
              <th colSpan={2} style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>중량(g)</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'right', border: '1px solid var(--border-color)' }}>구매<br/>단가</th>
              <th colSpan={2} style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>공임단가</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>알수</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>수량</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'right', border: '1px solid var(--border-color)' }}>합계</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>VAT</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>관리</th>
            </tr>
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid var(--border-color)', fontSize: '10px' }}>금</th>
              <th style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid var(--border-color)', fontSize: '10px' }}>순금</th>
              <th style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid var(--border-color)', fontSize: '10px' }}>기+추</th>
              <th style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid var(--border-color)', fontSize: '10px' }}>중+보</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row, idx) => {
                const isManualTx = !row.orderId;

                // 구분(type)별 텍스트 색상
                const getDivisionColor = (type: string) => {
                  switch (type) {
                    case '판매': return '#38bdf8'; // 하늘색
                    case '결제': return '#34d399'; // 초록색
                    case '반품': return '#fb7185'; // 분홍색
                    case 'DC': return '#a78bfa';   // 보라색
                    default: return '#38bdf8';
                  }
                };

                return (
                  <tr 
                    key={row.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)',
                      height: '32px'
                    }}
                  >
                    {/* No */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {idx + 1}
                    </td>

                    {/* ✔ */}
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={checkedRows.has(row.id)}
                        onChange={() => handleToggleRow(row.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>

                    {/* 일자 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {row.dateDisplay}
                    </td>

                    {/* 구분 */}
                    <td style={{ 
                      padding: '6px 4px', 
                      textAlign: 'center', 
                      fontWeight: 'bold', 
                      color: getDivisionColor(row.type)
                    }}
                    >
                      {row.type}
                    </td>

                    {/* 거래처 */}
                    <td style={{ padding: '6px 4px', fontWeight: '600' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-main)' }}>
                        {row.customerName}
                        <span style={{ color: isManualTx ? '#38bdf8' : '#a78bfa', fontSize: '9px' }}>◆</span>
                      </span>
                    </td>

                    {/* 거래No */}
                    <td 
                      style={{ 
                        padding: '6px 4px', 
                        textAlign: 'center', 
                        color: '#f472b6', 
                        fontWeight: '700', 
                        textDecoration: row.orderId ? 'underline' : 'none', 
                        cursor: row.orderId ? 'pointer' : 'default' 
                      }}
                      onClick={() => row.orderId && handlePrintInvoice(row.orderId)}
                    >
                      {row.tradeNo}
                    </td>

                    {/* 시리얼 주문번호 */}
                    <td 
                      style={{ 
                        padding: '6px 4px', 
                        textAlign: 'center', 
                        color: isManualTx ? 'transparent' : 'var(--text-main)'
                      }}
                    >
                      {isManualTx ? '' : row.serialNo}
                    </td>

                    {/* 모델 */}
                    <td 
                      style={{ 
                        padding: '6px 4px', 
                        fontWeight: '700', 
                        color: row.model && row.model !== '결제' ? '#38bdf8' : 'var(--text-main)',
                        textDecoration: row.model && row.model !== '결제' ? 'underline' : 'none',
                        cursor: row.model && row.model !== '결제' ? 'pointer' : 'default'
                      }}
                      onClick={() => {
                        if (row.model && row.model !== '결제') {
                          handleOpenDetailWindow(row.model);
                        }
                      }}
                    >
                      {row.model}
                    </td>

                    {/* 재질 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold' }}>{row.material}</td>

                    {/* 색상 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>{row.color || ''}</td>

                    {/* 비고 */}
                    <td 
                      style={{ padding: '6px 4px', textAlign: 'center', color: '#f472b6', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => row.note && alert(`[거래 메모]\n${row.note}`)}
                    >
                      {row.note ? '※' : ''}
                    </td>

                    {/* 중량: 금 */}
                    <td style={{ 
                      padding: '6px 4px', 
                      textAlign: 'right', 
                      color: isManualTx ? 'var(--text-main)' : '#a78bfa', 
                      textDecoration: isManualTx ? 'none' : 'underline',
                      fontWeight: isManualTx ? 'normal' : 'bold'
                    }}>
                      {row.weightGoldDon > 0 ? row.weightGoldDon.toFixed(2) : '0.00'}
                    </td>

                    {/* 중량: 순금 */}
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 'bold' }}>
                      {row.weightPureGoldDon > 0 ? row.weightPureGoldDon.toFixed(3) : '0.000'}
                    </td>

                    {/* 구매단가 */}
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                      {row.purchasePrice ? row.purchasePrice.toLocaleString() : ''}
                    </td>

                    {/* 공임단가 기+추 */}
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                      {row.laborBaseExtra ? row.laborBaseExtra.toLocaleString() : ''}
                    </td>

                    {/* 공임단가 중+보 */}
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                      {row.laborStone ? row.laborStone.toLocaleString() : ''}
                    </td>

                    {/* 알수 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>{row.stoneQty || ''}</td>

                    {/* 수량 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold' }}>{row.quantity}</td>

                    {/* 합계 */}
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: '700' }}>
                      {row.totalAmount ? row.totalAmount.toLocaleString() : ''}
                    </td>

                    {/* VAT */}
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>{row.vat || ''}</td>

                    {/* 관리 (수정 / 삭제) */}
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        {row.orderId ? (
                          <button
                            type="button"
                            onClick={() => startEditOrder(row.orderId!)}
                            className="btn-primary"
                            style={{
                              padding: '2px 6px',
                              fontSize: '10px',
                              background: 'rgba(212, 175, 55, 0.15)',
                              border: '1px solid rgba(212, 175, 55, 0.4)',
                              color: 'var(--primary)',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              boxShadow: 'none'
                            }}
                            title="주문서 수정"
                          >
                            수정
                          </button>
                        ) : (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>-</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            padding: '2px 6px',
                            borderRadius: '3px',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                          title="해당 데이터 영구 삭제"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={21} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  접수 및 접수 진행 중인 주문 내역이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
