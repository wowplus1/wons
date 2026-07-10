// src/components/InvoicePrintView.tsx
import React, { useEffect } from 'react';
import { useErpStore } from '../store/useErpStore';
import { Printer } from 'lucide-react';


export const InvoicePrintView: React.FC = () => {
  const { orders, customers, stones, transactions } = useErpStore();

  // Get orderId from query parameter
  const queryParams = new URLSearchParams(window.location.search);
  const orderId = queryParams.get('orderId') || '';
  const source = queryParams.get('source') || '';

  let order = orders.find(o => o.order_id === orderId);

  if (source === 'release') {
    const savedData = sessionStorage.getItem('selected_invoice_order');
    if (savedData) {
      try {
        order = JSON.parse(savedData);
      } catch (e) {
        console.error("Failed to parse selected_invoice_order", e);
      }
    }
  }

  useEffect(() => {
    if (order) {
      // Auto trigger print dialogue once rendered
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [order]);

  // ⚠️ Rules of Hooks: 아래 useMemo 훅들은 어떤 렌더에서도 동일한 순서로 호출되어야 하므로
  // 반드시 `if (!order) return` 조기 반환보다 위에서, null-safe 하게 선언한다.

  // 거래처별 누적 거래 차수(tradeNo) 계산
  const tradeNo = React.useMemo(() => {
    if (!order) return '1';
    const cId = order.customer_snapshot.customer_id;
    if (!cId) return '1';

    // 1) 주문서 이벤트 수집
    const customerEvents: { id: string; date: string }[] = [];
    orders.forEach(o => {
      if (o.customer_snapshot?.customer_id === cId) {
        if (!customerEvents.some(e => e.id === o.order_id)) {
          customerEvents.push({ id: o.order_id, date: o.order_date });
        }
      }
    });

    // 2) 결제(Transaction) 이벤트 수집
    transactions.forEach(tx => {
      if (tx.created_by === 'system') return;
      if (tx.customer_id === cId) {
        if (!customerEvents.some(e => e.id === tx.transaction_id)) {
          customerEvents.push({ id: tx.transaction_id, date: tx.created_at });
        }
      }
    });

    // 3) 시간순 정렬
    customerEvents.sort((a, b) => a.date.localeCompare(b.date));

    // 4) 현재 order_id의 누적 인덱스 반환
    if (order.order_id.startsWith('V-RELEASE')) {
      return String(customerEvents.length + 1);
    }

    const matchedIndex = customerEvents.findIndex(e => e.id === order.order_id);
    return matchedIndex !== -1 ? String(matchedIndex + 1) : '1';
  }, [order, orders, transactions]);

  // 최근 결제일 당일에 입고된 모든 순금 중량 합산 (self-contained, null-safe)
  const lastPaymentGoldDon = React.useMemo(() => {
    if (!order) return 0;
    const cId = order.customer_snapshot.customer_id;
    const lastIn = transactions
      .filter(t => t.customer_id === cId && t.type === 'in')
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (!lastIn) return 0;
    const dateStr = new Date(lastIn.created_at).toISOString().slice(5, 10);
    const sameDayTxs = transactions.filter(t =>
      t.customer_id === cId &&
      t.type === 'in' &&
      new Date(t.created_at).toISOString().slice(5, 10) === dateStr
    );
    const sumG = sameDayTxs.reduce((acc, t) => acc + (t.weight_g || 0), 0);
    return parseFloat((sumG / 3.75).toFixed(3));
  }, [order, transactions]);

  // 최근 결제일 당일에 주문서 결제 품목을 통해 입금된 현금 총합 계산 (self-contained, null-safe)
  const lastPaymentCashAmount = React.useMemo(() => {
    if (!order) return 0;
    const cId = order.customer_snapshot.customer_id;
    const lastIn = transactions
      .filter(t => t.customer_id === cId && t.type === 'in')
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (!lastIn) return 0;
    const dateStr = new Date(lastIn.created_at).toISOString().slice(5, 10);

    const customerOrders = orders.filter(o => o.customer_snapshot?.customer_id === cId);
    let sumCash = 0;
    customerOrders.forEach(o => {
      const oDateStr = new Date(o.order_date).toISOString().slice(5, 10);
      if (oDateStr === dateStr) {
        (o.items || []).forEach(item => {
          if (item.division === '결제') {
            const qty = item.quantity || 1;
            const baseLabor = item.labor_base || 0;
            const extraLabor = item.labor_extra || 0;
            const stoneLabor = item.labor_stone_total !== undefined ? item.labor_stone_total : ((item.labor_main || 0) * (item.qty_main || 0)) + ((item.labor_sub || 0) * (item.qty_sub || 0));
            const laborPerEa = baseLabor + extraLabor + stoneLabor;
            const laborTotalRow = laborPerEa * qty;
            sumCash += item.calculated_price || laborTotalRow;
          }
        });
      }
    });
    return sumCash;
  }, [order, orders, transactions]);

  if (!order) {
    return (
      <div style={{ padding: '20px', color: '#000', textAlign: 'center', fontSize: '15px', background: '#fff' }}>
        해당 주문 정보 또는 시세 데이터를 불러올 수 없습니다. (주문번호: {orderId})
      </div>
    );
  }

  // Find customer master data for ledger calculations
  const customer = customers.find(c => c.customer_id === order.customer_snapshot.customer_id);
  const customerLossRate = order.customer_snapshot.loss_rate || customer?.loss_rate || 0;
  const customerTradeType = order.customer_snapshot.trade_type || customer?.trade_type || 'price';

  // 1. Calculate sales metrics (Labor, Gold weight, Gold cost)
  let totalLaborSales = 0;

  // Purity-specific totals for ledger
  let goldSalesDon = 0;
  let goldReturnDon = 0;
  let goldPaymentDon = 0;

  let cashSales = 0;
  let cashReturn = 0;
  let cashDiscount = 0;
  let cashPayment = 0;

  let totalLaborReturn = 0;
  let totalGoldValueSales = 0;
  let totalGoldValueReturn = 0;

  // Track weight totals by material for list bottom summary (in Don)
  let weight14kTotalDon = 0;
  let weight18kTotalDon = 0;
  let weight24kTotalDon = 0;

  // Converted rate per don for 24K
  const sell24kDon = order.gold_rate_snapshot.sell_24k_per_g * 3.75;

  // Calculate each item's metrics first to map to the 11 columns
  const processedItems = order.items.map(item => {
    const qty = item.quantity || 1;
    const pureGoldWeightG = item.estimated_weight_g || 0;
    const goldWeightDon = pureGoldWeightG / 3.75;

    // Gold sales Don per single item (purity * loss_rate)
    const purityMultiplier = item.material === '14K' ? 0.585 : item.material === '18K' ? 0.750 : 1.0;
    const singleGoldSalesDon = Math.floor((goldWeightDon * purityMultiplier * (1 + customerLossRate / 100)) * 1000) / 1000;
    const itemGoldSales24kDon = singleGoldSalesDon * qty;

    // Gold Cost calculation (Don * rate)
    const goldCostRow = Math.round(itemGoldSales24kDon * sell24kDon);

    // Labor calculation
    const baseLabor = item.labor_base || 0;
    const extraLabor = item.labor_extra || 0;
    const stoneLabor = item.labor_stone_total !== undefined ? item.labor_stone_total : ((item.labor_main || 0) * (item.qty_main || 0)) + ((item.labor_sub || 0) * (item.qty_sub || 0));
    const laborPerEa = baseLabor + extraLabor + stoneLabor;
    const laborTotalRow = laborPerEa * qty;

    // Subtotal row logic (weight vs price customer)
    // Individual item rows (labor, gold, subtotal) are printed as absolute positive values as requested
    const subtotalRow = customerTradeType === 'weight' ? laborTotalRow : (laborTotalRow + goldCostRow);

    // Cumulative sums by division (payment, returns, discount are subtracted in the final ledger math)
    const itemDiv = item.division || '판매';
    if (itemDiv === '판매') {
      // Accumulate weights by material (in Don)
      if (item.material === '14K') weight14kTotalDon += goldWeightDon * qty;
      else if (item.material === '18K') weight18kTotalDon += goldWeightDon * qty;
      else if (item.material === '24K') weight24kTotalDon += goldWeightDon * qty;

      goldSalesDon += itemGoldSales24kDon;
      cashSales += subtotalRow;
      totalGoldValueSales += goldCostRow;
      totalLaborSales += laborTotalRow;
    } else if (itemDiv === '반품') {
      // Subtract returns from list totals
      if (item.material === '14K') weight14kTotalDon -= goldWeightDon * qty;
      else if (item.material === '18K') weight18kTotalDon -= goldWeightDon * qty;
      else if (item.material === '24K') weight24kTotalDon -= goldWeightDon * qty;

      goldReturnDon += itemGoldSales24kDon;
      cashReturn += subtotalRow;
      totalGoldValueReturn += goldCostRow;
      totalLaborReturn += laborTotalRow;
    } else if (itemDiv === 'DC') {
      // DC decreases cash balance
      cashDiscount += subtotalRow;
    } else if (itemDiv === '결제') {
      // Payment reduces ledger balance
      goldPaymentDon += itemGoldSales24kDon;
      cashPayment += subtotalRow;
    }

    // Calculate total stone weight per row (in Don)
    let subWeightEa = 0;
    if (item.stone_sub_id) {
      const subStone = stones.find(s => s.stone_id === item.stone_sub_id);
      subWeightEa = subStone?.weight_carat || 0;
    }
    const totalStonesWeightRowG = ((item.qty_main || 0) * (item.stone_weight_ea || 0) + (item.qty_sub || 0) * subWeightEa);
    const totalStonesWeightRowDon = totalStonesWeightRowG / 3.75;

    return {
      ...item,
      qty,
      goldWeightDon: goldWeightDon,
      totalStonesWeightRowDon,
      baseLabor,
      extraLabor,
      laborTotalRow: laborTotalRow,
      goldCostRow: goldCostRow,
      subtotalRow,
      singleGoldSalesDon: singleGoldSalesDon
    };
  });

  // Round up to 3 decimals
  goldSalesDon = parseFloat(goldSalesDon.toFixed(3));
  goldReturnDon = parseFloat(goldReturnDon.toFixed(3));
  goldPaymentDon = parseFloat(goldPaymentDon.toFixed(3));

  // 2. Ledger balance calculation (Backwards matching ledger snapshot)
  // 거래 후 잔액 (마스터 장부 현황)
  const goldAfterTxDon = customer ? parseFloat((customer.gold_balance_24k_g / 3.75).toFixed(3)) : 0;
  const cashAfterTx = customer?.receivable_amount || 0;
  
  // 거래 전 잔액 역산 (거래 전 = 거래 후 - 판매 + 반품 + 결제)
  const goldBeforeTxDon = parseFloat(Math.max(0, goldAfterTxDon - goldSalesDon + goldReturnDon + goldPaymentDon).toFixed(3));
  const cashBeforeTx = Math.max(0, cashAfterTx - cashSales + cashReturn + cashDiscount + cashPayment);

  // 테이블 하단 요약 계산 (소계 = 판매 - 반품)
  const printLaborSubtotal = totalLaborSales - totalLaborReturn;
  const printGoldSubtotal = totalGoldValueSales - totalGoldValueReturn;
  const printAmountSubtotal = customerTradeType === 'weight' ? printLaborSubtotal : (printLaborSubtotal + printGoldSubtotal);

  // Find recent payment (in) transaction for this customer
  const lastInTx = transactions
    .filter(t => t.customer_id === order.customer_snapshot.customer_id && t.type === 'in')
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  const lastPaymentDateStr = lastInTx 
    ? new Date(lastInTx.created_at).toISOString().slice(5, 10) 
    : '-'; // 이력이 없는 경우 빈칸 처리

  // 12 rows fixed template builder
  const maxRows = 12;
  const itemsCount = processedItems.length;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toISOString().slice(2, 10).replace(/-/g, '-');
  };

  // Helper renderer for single side invoice
  const renderSingleInvoice = (type: '보관용' | '고객용') => {
    const title = `거래 명세서(${type})`;
    return (
      <div className="invoice-box" style={{ 
        width: '49%', 
        height: '100%',
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        padding: '12px',
        boxSizing: 'border-box',
        background: '#fff',
        color: '#000',
        border: '1.5px solid #000',
        fontFamily: 'Gulim, "Malgun Gothic", sans-serif',
        flexShrink: 0,
        flexGrow: 0
      }}>
        {/* Invoice Header */}
        <div>
          {/* Header Top: Title & Info Card */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #000', paddingBottom: '5px' }}>
            <div>
              <h1 style={{ fontSize: '21px', fontWeight: '900', margin: 0, letterSpacing: '0.15em', color: '#000', fontFamily: 'Gulim, "Malgun Gothic", sans-serif' }}>
                {title}
              </h1>
              <div style={{ fontSize: '12px', marginTop: '6px', color: '#000', fontFamily: 'Gulim, sans-serif', letterSpacing: '-0.5px' }}>
                일자: {formatDate(order.order_date)} &nbsp;&nbsp;
                G당시세: {sell24kDon.toLocaleString()}(별도) &nbsp;&nbsp;
                거래No: {tradeNo}
              </div>
            </div>
            
            {/* Right Side Header Info */}
            {type === '보관용' ? (
              <div style={{ textAlign: 'left', fontSize: '9.5px', color: '#000', fontFamily: 'Gulim, sans-serif', lineHeight: '1.3', width: '150px' }}>
                <strong>거래처:</strong> {order.customer_snapshot.name}<br/>
                전 화:<br/>
                핸드폰: {order.customer_snapshot.phone || ''}
              </div>
            ) : (
              <div style={{ textAlign: 'left', fontSize: '9.5px', color: '#000', fontFamily: 'Gulim, sans-serif', lineHeight: '1.3', width: '150px' }}>
                <strong>공급자:</strong> 하트<br/>
                전 화: 02-766-8820<br/>
                팩 스:
              </div>
            )}
          </div>

          {/* Customer Name Row under header for Client Copy */}
          {type === '고객용' && (
            <div style={{ fontSize: '13px', fontWeight: '700', padding: '4px 0', borderBottom: '1px solid #000', fontFamily: 'Gulim, sans-serif' }}>
              거래처명: {order.customer_snapshot.name}
            </div>
          )}

          {/* Items Table */}
          <table className="print-table" style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            fontSize: '11px', 
            marginTop: '5px', 
            borderBottom: '2px solid #000',
            tableLayout: 'fixed'
          }}>
            <colgroup>
              <col style={{ width: '3%' }} />   {/* No */}
              <col style={{ width: '16%' }} />  {/* 모델번호 */}
              <col style={{ width: '8%' }} />   {/* 함량/색상 */}
              <col style={{ width: '11%' }} />  {/* 금중량/알중량 */}
              <col style={{ width: '4%' }} />   {/* 알수 */}
              <col style={{ width: '8.5%' }} /> {/* 개당공임 기본/추가 */}
              <col style={{ width: '8.5%' }} /> {/* 개당공임 보조/중심 */}
              <col style={{ width: '4%' }} />   {/* 수량 */}
              <col style={{ width: '12%' }} />  {/* VAT별도 공임합 */}
              <col style={{ width: '13%' }} />  {/* VAT별도 금값 */}
              <col style={{ width: '12%' }} />  {/* VAT별도 소계 */}
            </colgroup>
            <thead>
              <tr style={{ background: '#fff', borderTop: '1px solid #000', borderBottom: '1px solid #000', fontWeight: '700', fontSize: '10.5px' }}>
                <th rowSpan={2} style={{ border: '1px solid #000', padding: '2px 1px', textAlign: 'center' }}>No</th>
                <th rowSpan={2} style={{ border: '1px solid #000', padding: '2px 1px', textAlign: 'center' }}>모델번호</th>
                <th rowSpan={2} style={{ border: '1px solid #000', padding: '2px 1px', textAlign: 'center' }}>함량<br/>색상</th>
                <th rowSpan={2} style={{ border: '1px solid #000', padding: '2px 1px', textAlign: 'center' }}>금중량<br/>알중량</th>
                <th rowSpan={2} style={{ border: '1px solid #000', padding: '2px 1px', textAlign: 'center' }}>알<br/>수</th>
                <th colSpan={2} style={{ border: '1px solid #000', padding: '2px 1px', textAlign: 'center' }}>개당공임</th>
                <th rowSpan={2} style={{ border: '1px solid #000', padding: '2px 1px', textAlign: 'center' }}>수<br/>량</th>
                <th colSpan={3} style={{ border: '1px solid #000', padding: '2px 1px', textAlign: 'center' }}>VAT별도</th>
              </tr>
              <tr style={{ background: '#fff', borderBottom: '1px solid #000', fontSize: '8.5px' }}>
                <th style={{ border: '1px solid #000', padding: '2px 1px', textAlign: 'center', fontWeight: '700' }}>기본/추가</th>
                <th style={{ border: '1px solid #000', padding: '2px 1px', textAlign: 'center', fontWeight: '700' }}>보조/중심</th>
                <th style={{ border: '1px solid #000', padding: '2px 1px', textAlign: 'center', fontWeight: '700' }}>공임합</th>
                <th style={{ border: '1px solid #000', padding: '2px 1px', textAlign: 'center', fontWeight: '700' }}>금값</th>
                <th style={{ border: '1px solid #000', padding: '2px 1px', textAlign: 'center', fontWeight: '700' }}>소계</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxRows }).map((_, i) => {
                const item = processedItems[i];
                const isPlaceholder = i === itemsCount; // 노출 제품 바로 하단에 '이하여백' 표시
                
                if (item) {
                  return (
                    <tr key={i} style={{ height: '26px' }}>
                      <td style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', fontSize: '10px' }}>{i + 1}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 3px', fontWeight: '700', fontSize: '9px', letterSpacing: '-0.3px', wordBreak: 'break-all' }}>{item.model_number}</td>
                      <td style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', lineHeight: '1.1', fontSize: '10px' }}>
                        {item.division && item.division !== '판매' ? (
                          <span style={{ fontWeight: 'bold', color: item.division === '반품' ? 'red' : 'blue', display: 'block', fontSize: '8px' }}>
                            [{item.division}]
                          </span>
                        ) : ''}
                        {item.material}<br/>{item.color}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'right', lineHeight: '1.1', fontSize: '11px', letterSpacing: '-0.5px' }}>
                        {item.goldWeightDon > 0 ? item.goldWeightDon.toFixed(3) : '0.000'}<br/>
                        <span style={{ color: '#555', fontSize: '10px' }}>{item.totalStonesWeightRowDon > 0 ? item.totalStonesWeightRowDon.toFixed(3) : ''}</span>
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', verticalAlign: 'bottom', fontSize: '11px' }}>
                        {item.qty_main || ''}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'right', lineHeight: '1.1', fontSize: '10.5px', letterSpacing: '-0.5px' }}>
                        {item.baseLabor > 0 ? item.baseLabor.toLocaleString() : ''}<br/>
                        <span style={{ color: '#555' }}>{item.extraLabor > 0 ? item.extraLabor.toLocaleString() : ''}</span>
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'right', lineHeight: '1.1', fontSize: '10.5px', letterSpacing: '-0.5px' }}>
                        {item.labor_sub > 0 ? item.labor_sub.toLocaleString() : ''}<br/>
                        <span style={{ color: '#555' }}>{item.labor_main > 0 ? item.labor_main.toLocaleString() : ''}</span>
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', fontWeight: '700', fontSize: '11px' }}>{item.qty}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'right', fontSize: '11px', letterSpacing: '-0.5px' }}>
                        {item.laborTotalRow.toLocaleString()}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'right', fontSize: '11px', letterSpacing: '-0.5px', color: '#333' }}>
                        {item.goldCostRow > 0 ? item.goldCostRow.toLocaleString() : ''}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 3px', textAlign: 'right', fontSize: '11px', letterSpacing: '-0.5px', fontWeight: '700' }}>
                        {item.subtotalRow.toLocaleString()}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={i} style={{ height: '26px' }}>
                    <td style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', color: '#999', fontSize: '10px' }}>{i + 1}</td>
                    <td style={{ border: '1px solid #000', padding: '2px 6px', color: '#333', fontStyle: 'italic', fontSize: '11px' }}>
                      {isPlaceholder ? '-이하여백-' : ''}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '2px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '2px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '2px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '2px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '2px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '2px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '2px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '2px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '2px' }}></td>
                  </tr>
                );
              })}
              
              {/* Summary Bottom Row */}
              <tr style={{ background: '#fff', fontWeight: '700', borderTop: '2px solid #000', borderBottom: '2px solid #000' }}>
                <td colSpan={2} style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontSize: '11px' }}>소계<br/>(판매-반품)</td>
                <td style={{ border: '1px solid #000', padding: '3px 2px', fontSize: '8.5px', textAlign: 'center', lineHeight: '1.1' }}>
                  {weight14kTotalDon !== 0 && '14K'}<br/>{weight18kTotalDon !== 0 && '18K'}
                </td>
                <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'right', lineHeight: '1.1', fontSize: '11px', letterSpacing: '-0.5px' }}>
                  {weight14kTotalDon !== 0 && `${weight14kTotalDon.toFixed(3)}`}<br/>
                  {weight18kTotalDon !== 0 && `${weight18kTotalDon.toFixed(3)}`}
                </td>
                <td style={{ border: '1px solid #000', padding: '3px 2px' }}></td>
                <td style={{ border: '1px solid #000', padding: '3px 2px' }}></td>
                <td style={{ border: '1px solid #000', padding: '3px 2px' }}></td>
                <td style={{ border: '1px solid #000', padding: '3px 2px', textAlign: 'center', fontSize: '11px' }}>
                  {order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)}
                </td>
                <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'right', fontSize: '11px', letterSpacing: '-0.5px' }}>
                  {printLaborSubtotal.toLocaleString()}
                </td>
                <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'right', fontSize: '11px', letterSpacing: '-0.5px', color: '#333' }}>
                  {printGoldSubtotal !== 0 ? printGoldSubtotal.toLocaleString() : ''}
                </td>
                <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'right', fontSize: '11px', letterSpacing: '-0.5px', fontWeight: '700' }}>
                  {printAmountSubtotal.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '2px', fontFamily: 'Gulim, sans-serif' }}>
            <span></span>
            <strong style={{ letterSpacing: '2px' }}>[1][끝]</strong>
          </div>
        </div>

        {/* Ledger Summary Box */}
        <div>
          <table className="print-ledger-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginTop: '12px', border: '1.5px solid #000' }}>
            <thead>
              <tr style={{ background: '#fff', borderBottom: '1.5px solid #000' }}>
                <th style={{ border: '1px solid #000', padding: '4px', width: '28%', textAlign: 'center', fontWeight: '700' }}></th>
                <th style={{ border: '1px solid #000', padding: '4px', width: '24%', textAlign: 'center', fontWeight: '700' }}>순금(g)</th>
                <th style={{ border: '1px solid #000', padding: '4px', width: '24%', textAlign: 'center', fontWeight: '700' }}>공임 및 현금</th>
                <th style={{ border: '1px solid #000', padding: '4px', width: '24%', textAlign: 'center', fontWeight: '700' }}>금액합계</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ height: '21px' }}>
                <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: '700', textAlign: 'center' }}>최근결제({lastPaymentDateStr})</td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right' }}>
                  {lastPaymentGoldDon > 0 ? lastPaymentGoldDon.toFixed(3) : ''}
                </td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right' }}>
                  {lastPaymentCashAmount > 0 ? lastPaymentCashAmount.toLocaleString() : ''}
                </td>
                <td style={{ border: '1px solid #000', padding: '2px 4px' }}></td>
              </tr>
              <tr style={{ height: '21px', fontWeight: '700' }}>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>
                  <span style={{ color: 'red', marginRight: '3px', fontWeight: '800' }}>✔</span>거래 전 미수
                </td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right' }}>
                  {goldBeforeTxDon.toFixed(3)}
                </td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right' }}>
                  {cashBeforeTx.toLocaleString()}
                </td>
                <td style={{ border: '1px solid #000', padding: '2px 4px' }}></td>
              </tr>
              <tr style={{ height: '21px' }}>
                <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: '700', textAlign: 'center' }}>판매</td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: '700' }}>
                  {goldSalesDon > 0 ? goldSalesDon.toFixed(3) : ''}
                </td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: '700' }}>
                  {cashSales > 0 ? cashSales.toLocaleString() : ''}
                </td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: '700' }}>
                  {cashSales > 0 ? cashSales.toLocaleString() : ''}
                </td>
              </tr>
              <tr style={{ height: '21px' }}>
                <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: '700', textAlign: 'center' }}>반품</td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: '700' }}>
                  {goldReturnDon > 0 ? goldReturnDon.toFixed(3) : ''}
                </td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: '700' }}>
                  {cashReturn > 0 ? cashReturn.toLocaleString() : ''}
                </td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: '700' }}>
                  {cashReturn > 0 ? cashReturn.toLocaleString() : ''}
                </td>
              </tr>
              <tr style={{ height: '21px' }}>
                <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: '700', textAlign: 'center' }}>DC</td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: '700' }}>
                  {/* DC는 금이 없음 */}
                </td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: '700' }}>
                  {cashDiscount > 0 ? cashDiscount.toLocaleString() : ''}
                </td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: '700' }}>
                  {cashDiscount > 0 ? cashDiscount.toLocaleString() : ''}
                </td>
              </tr>
              <tr style={{ height: '21px' }}>
                <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: '700', textAlign: 'center' }}>결제</td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: '700' }}>
                  {goldPaymentDon > 0 ? goldPaymentDon.toFixed(3) : ''}
                </td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: '700' }}>
                  {cashPayment > 0 ? cashPayment.toLocaleString() : ''}
                </td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: '700' }}>
                  {cashPayment > 0 ? cashPayment.toLocaleString() : ''}
                </td>
              </tr>
              <tr style={{ height: '21px', fontWeight: '700', background: '#fff' }}>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>
                  <span style={{ color: 'red', marginRight: '3px', fontWeight: '800' }}>✔</span>거래 후 미수
                </td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontSize: '13px' }}>
                  {goldAfterTxDon.toFixed(3)}
                </td>
                <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontSize: '13px' }}>
                  {cashAfterTx.toLocaleString()}
                </td>
                <td style={{ border: '1px solid #000', padding: '2px 4px' }}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', background: '#f4f5f8', minHeight: '100vh', boxSizing: 'border-box' }} className="invoice-print-container">
      {/* Print Trigger Control (Web screen mode only) */}
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
        <div>
          <strong style={{ color: '#d4af37' }}>[거래 명세서 출력 모드]</strong> A4 가로(Landscape)에 최적화된 화면입니다. 인쇄 창이 뜨지 않으면 버튼을 눌러주세요.
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

      {/* Actual Invoice Sheet (2-Column Layout) */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        width: '282mm',
        height: '194mm',
        margin: '0 auto',
        gap: '2%',
        position: 'relative',
        background: '#fff',
        padding: '12px',
        borderRadius: '6px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        boxSizing: 'border-box',
        border: '1px solid #ddd'
      }} className="print-sheets-wrapper">
        {renderSingleInvoice('보관용')}
        
        {/* Vertical dotted folding line in between */}
        <div className="no-print" style={{
          position: 'absolute',
          left: '50%',
          top: '0',
          bottom: '0',
          width: '1px',
          borderLeft: '1px dashed #bbb',
          transform: 'translateX(-50%)'
        }}></div>

        {renderSingleInvoice('고객용')}
      </div>

      {/* Global Print-specific CSS Injection */}
      <style>{`
        @page {
          size: A4 landscape;
          margin: 5mm 6mm;
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
          .invoice-print-container {
            background: #fff !important;
            padding: 0 !important;
            min-height: auto !important;
          }
          .print-sheets-wrapper {
            width: 285mm !important;
            height: 200mm !important;
            max-width: 100% !important;
            gap: 2% !important;
            display: flex !important;
            flex-direction: row !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
          }
          .invoice-box {
            width: 49% !important;
            height: 100% !important;
            border: 1.5px solid #000 !important;
            padding: 10px !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            background: #fff !important;
            color: #000 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
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
