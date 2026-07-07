// src/components/CompletedLedger.tsx
import React, { useState, useEffect } from 'react';
import { useErpStore } from '../store/useErpStore';
import { FileCheck, ListFilter, Users } from 'lucide-react';

interface LedgerRowData {
  id: string; // `completed-item::${order_id}::${item_id}::${itemIdx}`
  date: string;
  dateDisplay: string;
  type: '판매' | '결제' | '반품' | 'DC';
  customerName: string;
  customerId: string;
  orderId: string;
  itemId: number;
  paymentStatus: '결제완료' | '결제전' | '보류';
  serialNo: string;
  tradeNo: string;
  model: string;
  material: string;
  color?: string;
  note: string;
  weightGoldDon: number;
  weightPureGoldDon: number;
  weightGoldG?: number; // 금중량 (g)
  weightPureGoldG?: number; // 순금중량 (g)
  purchasePrice: number;
  laborBaseExtra: number;
  laborStone: number;
  stoneQty?: number;
  quantity: number;
  totalAmount: number;
  vat?: string;
}

export const CompletedLedger: React.FC = () => {
  const { orders, customers, transactions, fetchDb, updateMultipleItemsPaymentStatus, updateMultipleItemsStatus, activeTab, setActiveTab } = useErpStore();
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterType, setFilterType] = useState<'전체' | '판매' | '결제' | '반품' | 'DC'>('전체');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'by-customer'>('list');
  const pageSize = 30;

  useEffect(() => {
    setCurrentPage(1);
    setSelectedRows([]);
  }, [filterCustomer, filterType, activeTab]);

  // 탭이 전환되면 필터 및 뷰 모드 초기화
  useEffect(() => {
    setFilterCustomer('');
    setFilterType('전체');
    setViewMode('list');
    setCurrentPage(1);
    setSelectedRows([]);
  }, [activeTab]);

  useEffect(() => {
    fetchDb();
  }, [fetchDb]);

  const handleRevertToReleaseReady = (orderId: string, itemId: number) => {
    if (window.confirm(`선택하신 품목(주문번호: ${orderId})을 '출고 대기' 상태로 되돌리시겠습니까?\n되돌린 후 출고 대기 대장으로 자동 이동합니다.`)) {
      updateMultipleItemsStatus([{ orderId, itemId }], '출고대기');
      alert('출고 대기 상태로 복구되었습니다.');
      setTimeout(() => {
        setActiveTab('release_list');
      }, 50);
    }
  };

  const handleRevertToUnpaid = async (orderId: string, itemId: number) => {
    if (window.confirm(`선택하신 품목을 '결제전(미수)' 상태로 되돌리시겠습니까?\n되돌린 후 미수금 장부 대장으로 자동 이동합니다.`)) {
      await updateMultipleItemsPaymentStatus([{ orderId, itemId }], '결제전');
      alert('결제전 미수 상태로 복구되었습니다.');
      setTimeout(() => {
        setActiveTab('unpaid_ledger');
      }, 50);
    }
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

  // Compile tradeNoMap (거래처별 누적 차수 계산)
  const completedRows = React.useMemo(() => {
    const customerEvents: { [customerId: string]: { id: string; date: string }[] } = {};

    orders.forEach(order => {
      const cId = order.customer_snapshot?.customer_id;
      if (!cId) return;
      if (!customerEvents[cId]) {
        customerEvents[cId] = [];
      }
      if (!customerEvents[cId].some(e => e.id === order.order_id)) {
        customerEvents[cId].push({
          id: order.order_id,
          date: order.order_date
        });
      }
    });

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

    const tradeNoMap: { [customerId: string]: { [eventId: string]: number } } = {};
    Object.keys(customerEvents).forEach(cId => {
      const sorted = [...customerEvents[cId]].sort((a, b) => a.date.localeCompare(b.date));
      tradeNoMap[cId] = {};
      sorted.forEach((event, index) => {
        tradeNoMap[cId][event.id] = index + 1;
      });
    });

    const rows: LedgerRowData[] = [];

    // 개별 품목의 status가 '출고완료'인 품목들만 수집
    orders.forEach(order => {
      if (!order) return;

      const cId = order.customer_snapshot?.customer_id;
      const customer = cId ? customers.find(c => c.customer_id === cId) : undefined;
      const lossRate = order.customer_snapshot?.loss_rate || customer?.loss_rate || 0;

      const itemsList = order.items || [];
      itemsList.forEach((item, itemIdx) => {
        const itemStatus = item.status || order.status || '접수';
        if (itemStatus !== '출고완료') return;
        const division = item.division || '판매';

        const qty = item.quantity || 1;
        const pureGoldWeightG = item.estimated_weight_g || 0;
        const weightGoldDon = pureGoldWeightG / 3.75;

        const purity = item.material === '14K' ? 0.585 : item.material === '18K' ? 0.750 : 1.0;
        const singleGoldSalesDon = Math.floor((weightGoldDon * purity * (1 + lossRate / 100)) * 1000) / 1000;
        const weightPureGoldDon = singleGoldSalesDon * qty;

        // 소수점 오차 없는 그람(g) 단위 중량 연산
        const weightGoldG = pureGoldWeightG;
        const weightPureGoldG = weightPureGoldDon * 3.75;

        const baseLabor = item.labor_base || 0;
        const extraLabor = item.labor_extra || 0;
        const laborBaseExtra = baseLabor + extraLabor;
        const laborStone = item.labor_stone_total !== undefined ? item.labor_stone_total : ((item.labor_main || 0) * (item.qty_main || 0)) + ((item.labor_sub || 0) * (item.qty_sub || 0));
        const totalAmount = (laborBaseExtra + laborStone) * qty;

        const serialNo = order.order_id.replace(/[^0-9]/g, '').slice(-8) || order.order_id.slice(-8);
        const tradeNoVal = cId ? (tradeNoMap[cId]?.[order.order_id] || 1) : 1;
        const tradeNo = String(tradeNoVal);

        // 매입 단가 임시 매핑
        let purchasePrice = 20000;
        if (item.model_number === '650M-런블') purchasePrice = 97400;
        else if (item.model_number === '벨R-562') purchasePrice = 22000;
        else if (item.model_number === '벨M-549') purchasePrice = 150800;
        else if (item.model_number.includes('JP출력')) purchasePrice = 20000;

        rows.push({
          id: `completed-item::${order.order_id}::${item.item_id}::${itemIdx}`,
          date: order.order_date,
          dateDisplay: (() => {
            try {
              const d = new Date(order.order_date);
              return isNaN(d.getTime()) ? '-' : d.toISOString().slice(5, 10);
            } catch {
              return '-';
            }
          })(),
          type: division,
          customerName: order.customer_snapshot?.name || '알수없음',
          customerId: cId || '',
          orderId: order.order_id,
          itemId: item.item_id,
          paymentStatus: item.payment_status || '결제전',
          serialNo,
          tradeNo,
          model: item.model_number,
          material: item.material,
          color: item.color,
          note: item.note || '',
          weightGoldDon,
          weightPureGoldDon,
          weightGoldG,
          weightPureGoldG,
          purchasePrice,
          laborBaseExtra,
          laborStone,
          stoneQty: item.qty_main || undefined,
          quantity: qty,
          totalAmount
        });
      });
    });

    return rows;
  }, [orders, transactions, customers]);

  // Filter by search text, type and activeTab
  const filteredRows = React.useMemo(() => {
    return completedRows.filter(row => {
      const matchCustomer = row.customerName.toLowerCase().includes(filterCustomer.toLowerCase());
      const matchType = filterType === '전체' || row.type === filterType;
      const matchSubTab = activeTab === 'unpaid_ledger' ? row.paymentStatus === '결제전' 
                        : activeTab === 'paid_ledger' ? row.paymentStatus === '결제완료'
                        : row.paymentStatus === '보류';
      return matchCustomer && matchType && matchSubTab;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [completedRows, filterCustomer, filterType, activeTab]);

  // 거래처별 집계
  const customerSummary = React.useMemo(() => {
    const map: Record<string, { customerName: string; customerId: string; count: number; totalQty: number; totalPureGoldG: number; totalAmount: number }> = {};
    filteredRows.forEach(row => {
      if (!map[row.customerId]) {
        map[row.customerId] = { customerName: row.customerName, customerId: row.customerId, count: 0, totalQty: 0, totalPureGoldG: 0, totalAmount: 0 };
      }
      map[row.customerId].count += 1;
      map[row.customerId].totalQty += row.quantity;
      map[row.customerId].totalPureGoldG += (row.weightPureGoldG || 0) * row.quantity;
      map[row.customerId].totalAmount += row.totalAmount;
    });
    return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredRows]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + pageSize);

  // Selection Checkbox Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(paginatedRows.map(r => r.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (rowId: string, checked: boolean) => {
    if (checked) {
      setSelectedRows(prev => [...prev, rowId]);
    } else {
      setSelectedRows(prev => prev.filter(id => id !== rowId));
    }
  };

  // Batch update payment status and auto navigate
  const handleBatchPaymentStatusUpdateCustom = (targetStatus: '결제완료' | '결제전' | '보류') => {
    if (selectedRows.length === 0) {
      alert('선택된 품목이 없습니다.');
      return;
    }

    const updates = selectedRows.map(rowId => {
      const parts = rowId.split('::');
      return {
        orderId: parts[1],
        itemId: parseInt(parts[2])
      };
    });

    let message = '';
    let targetTab: 'unpaid_ledger' | 'paid_ledger' | 'hold_ledger' = 'unpaid_ledger';

    if (targetStatus === '결제완료') {
      message = `선택하신 ${selectedRows.length}건을 [결제완료] 상태로 변경하시겠습니까?\n변경 완료 후 결제완료 대장으로 자동 이동합니다.`;
      targetTab = 'paid_ledger';
    } else if (targetStatus === '보류') {
      message = `선택하신 ${selectedRows.length}건을 [보류] 상태로 변경하시겠습니까?\n변경 완료 후 보류 대장으로 자동 이동합니다.`;
      targetTab = 'hold_ledger';
    } else {
      // Revert to unpaid
      if (activeTab === 'hold_ledger') {
        message = `선택하신 ${selectedRows.length}건을 [보류 해제 (미수)] 상태로 되돌리시겠습니까?\n변경 완료 후 미수 대장으로 자동 이동합니다.`;
      } else {
        message = `선택하신 ${selectedRows.length}건을 [결제전 (미수)] 상태로 되돌리시겠습니까?\n변경 완료 후 미수 대장으로 자동 이동합니다.`;
      }
      targetTab = 'unpaid_ledger';
    }

    if (window.confirm(message)) {
      updateMultipleItemsPaymentStatus(updates, targetStatus);
      setSelectedRows([]);
      alert('상태 갱신이 완료되었습니다.');
      
      // Auto tab transition
      setTimeout(() => {
        setActiveTab(targetTab);
      }, 50);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <h2 style={{ fontSize: '19px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileCheck size={18} style={{ color: 'var(--primary)' }} />
          <span className="gradient-text" style={{ fontFamily: 'var(--font-title)', fontWeight: '600' }}>
            {activeTab === 'unpaid_ledger' ? 'Unpaid Release Ledger' : activeTab === 'paid_ledger' ? 'Paid Release Ledger' : 'Hold Release Ledger'}
          </span>
          <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
            {activeTab === 'unpaid_ledger' ? '(미수금 장부 대장 - 결제전)' : activeTab === 'paid_ledger' ? '(수금완료 장부 대장 - 결제완료)' : '(보류 대장)'}
          </span>
        </h2>
      </div>

      {/* Filter Options */}
      <div className="ledger-filter-toolbar" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(255,255,255,0.01)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: '700', color: 'var(--text-muted)' }}>거래처 검색:</label>
          <input
            type="text"
            placeholder="거래처명 입력..."
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            className="input-field"
            style={{ width: '160px', padding: '5px 10px', fontSize: '15px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: '700', color: 'var(--text-muted)' }}>구분 필터:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as '전체' | '판매' | '결제' | '반품' | 'DC')}
            className="input-field"
            style={{ width: '120px', padding: '5px 10px', fontSize: '15px' }}
          >
            <option value="전체">전체 구분</option>
            <option value="판매">판매 (주문)</option>
            <option value="결제">결제 (정산)</option>
            <option value="반품">반품</option>
            <option value="DC">DC</option>
          </select>
        </div>

        {/* 뷰 전환 버튼 */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setViewMode('list')}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 14px', borderRadius: '5px', fontSize: '13px', fontWeight: '700',
              border: viewMode === 'list' ? '2px solid var(--primary)' : '2px solid #888',
              background: viewMode === 'list' ? 'rgba(212,175,55,0.18)' : 'rgba(128,128,128,0.12)',
              color: viewMode === 'list' ? 'var(--primary)' : '#555',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <ListFilter size={13} /> 전체 목록
          </button>
          <button
            onClick={() => { setViewMode('by-customer'); setFilterCustomer(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 14px', borderRadius: '5px', fontSize: '13px', fontWeight: '700',
              border: viewMode === 'by-customer' ? '2px solid var(--primary)' : '2px solid #888',
              background: viewMode === 'by-customer' ? 'rgba(212,175,55,0.18)' : 'rgba(128,128,128,0.12)',
              color: viewMode === 'by-customer' ? 'var(--primary)' : '#555',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <Users size={13} /> 거래처별 보기
          </button>
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '14px', color: 'var(--text-muted)' }}>
          {activeTab === 'unpaid_ledger' ? '미수금' : activeTab === 'paid_ledger' ? '수금완료' : '보류'} 총 건수: <strong style={{ color: 'var(--primary)' }}>{filteredRows.length}</strong>건
        </div>
      </div>

      {/* Batch Action Buttons */}
      <div className="ledger-action-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab === 'unpaid_ledger' && (
            <>
              <button
                onClick={() => handleBatchPaymentStatusUpdateCustom('결제완료')}
                className="btn-primary"
                disabled={selectedRows.length === 0}
                style={{
                  padding: '6px 16px',
                  fontSize: '15px',
                  background: selectedRows.length > 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'rgba(255,255,255,0.05)',
                  color: selectedRows.length > 0 ? '#fff' : 'rgba(255,255,255,0.3)',
                  border: 'none',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  cursor: selectedRows.length > 0 ? 'pointer' : 'not-allowed',
                  boxShadow: 'none'
                }}
              >
                선택 항목 결제완료 처리 (결제완료 대장 이동)
              </button>
              <button
                onClick={() => handleBatchPaymentStatusUpdateCustom('보류')}
                className="btn-primary"
                disabled={selectedRows.length === 0}
                style={{
                  padding: '6px 16px',
                  fontSize: '15px',
                  background: selectedRows.length > 0 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'rgba(255,255,255,0.05)',
                  color: selectedRows.length > 0 ? '#fff' : 'rgba(255,255,255,0.3)',
                  border: 'none',
                  fontWeight: 'bold',
                  borderRadius: '4px',
                  cursor: selectedRows.length > 0 ? 'pointer' : 'not-allowed',
                  boxShadow: 'none',
                  marginLeft: '8px'
                }}
              >
                선택 항목 보류 처리 (보류 대장 이동)
              </button>
            </>
          )}
          {activeTab === 'paid_ledger' && (
            <button
              onClick={() => handleBatchPaymentStatusUpdateCustom('결제전')}
              className="btn-primary"
              disabled={selectedRows.length === 0}
              style={{
                padding: '6px 16px',
                fontSize: '15px',
                background: selectedRows.length > 0 ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'rgba(255,255,255,0.05)',
                color: selectedRows.length > 0 ? '#fff' : 'rgba(255,255,255,0.3)',
                border: 'none',
                fontWeight: 'bold',
                borderRadius: '4px',
                cursor: selectedRows.length > 0 ? 'pointer' : 'not-allowed',
                boxShadow: 'none'
              }}
            >
              선택 항목 결제 취소 (미수금 대장 이동)
            </button>
          )}
          {activeTab === 'hold_ledger' && (
            <button
              onClick={() => handleBatchPaymentStatusUpdateCustom('결제전')}
              className="btn-primary"
              disabled={selectedRows.length === 0}
              style={{
                padding: '6px 16px',
                fontSize: '15px',
                background: selectedRows.length > 0 ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(255,255,255,0.05)',
                color: selectedRows.length > 0 ? '#fff' : 'rgba(255,255,255,0.3)',
                border: 'none',
                fontWeight: 'bold',
                borderRadius: '4px',
                cursor: selectedRows.length > 0 ? 'pointer' : 'not-allowed',
                boxShadow: 'none'
              }}
            >
              선택 항목 보류 해제 (미수금 대장 이동)
            </button>
          )}
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          선택된 항목 수: <strong style={{ color: 'var(--primary)' }}>{selectedRows.length}</strong>개
        </div>
      </div>

      {/* 거래처별 보기 뷰 */}
      {viewMode === 'by-customer' && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
            <thead>
              <tr style={{ background: 'rgba(212,175,55,0.07)', borderBottom: '2px solid var(--primary)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'center', border: '1px solid var(--border-color)', width: '40px' }}>No</th>
                <th style={{ padding: '10px 12px', border: '1px solid var(--border-color)' }}>거래처명</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', border: '1px solid var(--border-color)', width: '80px' }}>품목 수</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', border: '1px solid var(--border-color)', width: '80px' }}>총 수량</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', border: '1px solid var(--border-color)', width: '120px' }}>순금 중량 (g)</th>
                <th style={{ padding: '10px 12px', textAlign: 'right', border: '1px solid var(--border-color)', width: '140px' }}>합계 금액 (원)</th>
              </tr>
            </thead>
            <tbody>
              {customerSummary.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>해당 내역이 없습니다.</td></tr>
              ) : (
                customerSummary.map((cs, idx) => (
                  <tr
                    key={cs.customerId}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      height: '40px',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                      cursor: 'pointer',
                      transition: 'background 0.15s'
                    }}
                    onClick={() => { setFilterCustomer(cs.customerName); setViewMode('list'); }}
                    title={`클릭하면 ${cs.customerName} 필터로 전체 목록 보기`}
                  >
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 12px', fontWeight: '700', fontSize: '15px' }}>
                      {cs.customerName}
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '6px' }}>→ 클릭해서 상세보기</span>
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600' }}>{cs.count}건</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '600' }}>{cs.totalQty}개</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: 'var(--primary)', fontFamily: 'var(--font-title)' }}>
                      {cs.totalPureGoldG.toFixed(3)}g
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', color: '#ef4444', fontFamily: 'var(--font-title)' }}>
                      {cs.totalAmount.toLocaleString()}원
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {customerSummary.length > 0 && (
              <tfoot>
                <tr style={{ background: 'rgba(212,175,55,0.1)', borderTop: '2px solid var(--primary)', fontWeight: '800' }}>
                  <td colSpan={2} style={{ padding: '10px 12px', fontSize: '14px', color: 'var(--text-muted)' }}>합계 ({customerSummary.length}개 거래처)</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--primary)' }}>{customerSummary.reduce((s, c) => s + c.count, 0)}건</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--primary)' }}>{customerSummary.reduce((s, c) => s + c.totalQty, 0)}개</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--primary)', fontFamily: 'var(--font-title)' }}>
                    {customerSummary.reduce((s, c) => s + c.totalPureGoldG, 0).toFixed(3)}g
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#ef4444', fontFamily: 'var(--font-title)' }}>
                    {customerSummary.reduce((s, c) => s + c.totalAmount, 0).toLocaleString()}원
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Table grid (전체 목록 뷰) */}
      {viewMode === 'list' && <div className="table-responsive" style={{ overflowX: 'auto' }}>
        <table className="excel-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px', fontSize: '14px', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '3%' }} />
            <col style={{ width: '3%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '3%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '3%' }} />
            <col style={{ width: '3%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '6%' }} />
          </colgroup>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll} 
                  checked={filteredRows.length > 0 && selectedRows.length === filteredRows.length}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>No</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>일자</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>구분</th>
              <th rowSpan={2} style={{ padding: '6px 4px', border: '1px solid var(--border-color)' }}>거래처</th>
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
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>상태</th>
              <th rowSpan={2} style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>되돌리기</th>
            </tr>
            <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid var(--border-color)', fontSize: '13px' }}>금</th>
              <th style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid var(--border-color)', fontSize: '13px' }}>순금</th>
              <th style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid var(--border-color)', fontSize: '13px' }}>기+추</th>
              <th style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid var(--border-color)', fontSize: '13px' }}>중+보</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, idx) => {
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
                    {/* 체크박스 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedRows.includes(row.id)}
                        onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>

                    {/* No */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {idx + 1}
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
                      {row.customerName}
                    </td>

                    {/* 모델 (상세 조회 팝업) */}
                    <td 
                      style={{ 
                        padding: '6px 4px', 
                        fontWeight: '700', 
                        color: '#38bdf8',
                        textDecoration: 'underline',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleOpenDetailWindow(row.model)}
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
                    <td style={{ padding: '6px 4px', textAlign: 'right', color: '#a78bfa', fontWeight: 'bold' }}>
                      {row.weightGoldG && row.weightGoldG > 0 ? row.weightGoldG.toFixed(2) : '0.00'}
                    </td>

                    {/* 중량: 순금 */}
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 'bold' }}>
                      {row.weightPureGoldG && row.weightPureGoldG > 0 ? row.weightPureGoldG.toFixed(3) : '0.000'}
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

                    {/* 상태 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 6px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold' }}>
                        출고 완료
                      </span>
                    </td>

                    {/* 되돌리기 */}
                    <td style={{ padding: '4px', textAlign: 'center' }}>
                      {activeTab === 'unpaid_ledger' ? (
                        <button
                          onClick={() => handleRevertToReleaseReady(row.orderId, row.itemId)}
                          className="btn-primary"
                          style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: 'none'
                          }}
                          title="출고대기 상태로 되돌리기"
                        >
                          ← 출고대기
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRevertToUnpaid(row.orderId, row.itemId)}
                          className="btn-primary"
                          style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#3b82f6',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: 'none'
                          }}
                          title="미수대장(결제전) 상태로 되돌리기"
                        >
                          ← 미수대장
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={19} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {activeTab === 'unpaid_ledger' ? '결제전 미수금 내역이 존재하지 않습니다.' : '결제 완료된 내역이 존재하지 않습니다.'}
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
                    onClick={() => {
                      setCurrentPage(page);
                    }}
                    className="btn-primary"
                    style={{
                      padding: '5px 12px',
                      fontSize: '13px',
                      minWidth: '32px',
                      background: isActive ? 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)' : 'transparent',
                      color: isActive ? 'var(--text-inverse)' : 'var(--text-muted)',
                      border: isActive ? 'none' : '1px solid var(--border-color)',
                      boxShadow: isActive ? '0 2px 6px rgba(170, 133, 19, 0.15)' : 'none',
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
      </div>}

    </div>
  );
};
