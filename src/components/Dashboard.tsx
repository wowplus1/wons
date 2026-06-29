// src/components/Dashboard.tsx
import React from 'react';
import { useErpStore } from '../store/useErpStore';
import { TrendingUp, Layers, DollarSign, Calendar } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { currentRates, totalReceivable, totalGoldBalance24k, orders, customers } = useErpStore();

  // 당월 및 전월 기간 계산 (KST 대응)
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const currentMonthStr = `${curYear}-${String(curMonth).padStart(2, '0')}`;

  let prevYear = curYear;
  let prevMonth = curMonth - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = curYear - 1;
  }
  const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  // 당월 신규 접수 주문 필터링 (접수 기준)
  const currentMonthOrders = (orders || []).filter(o => o.order_date && o.order_date.startsWith(currentMonthStr));

  // 전월 및 당월 매출/금중량 동적 합산
  let currentMonthRevenue = 0;
  let currentMonthGold = 0;
  let prevMonthRevenue = 0;
  let prevMonthGold = 0;

  (orders || []).forEach(order => {
    if (!order.items) return;

    const customerDetail = (customers || []).find(c => c.customer_id === order.customer_snapshot.customer_id);
    const lossRate = order.customer_snapshot.loss_rate || customerDetail?.loss_rate || 0;
    const lossMultiplier = (1 + lossRate / 100);

    order.items.forEach(item => {
      const itemStatus = item.status || order.status || '접수';
      const paymentStatus = item.payment_status || '결제전';

      // 결제완료 대장 입적 기준 (출고완료 && 결제완료)
      if (itemStatus === '출고완료' && paymentStatus === '결제완료') {
        const dateStr = item.release_date || order.order_date || '';
        const isCurrentMonth = dateStr.startsWith(currentMonthStr);
        const isPrevMonth = dateStr.startsWith(prevMonthStr);

        if (isCurrentMonth || isPrevMonth) {
          const division = item.division || '판매';
          if (division === '결제') return; // 단순 입금/수금 품목은 매출 집계 제외

          const price = item.calculated_price || 0;

          const purityMultiplier = item.material === '14K' ? (0.585 * lossMultiplier) 
                                 : item.material === '18K' ? (0.750 * lossMultiplier) 
                                 : 1.0;
          const wt = item.actual_weight_g !== undefined ? item.actual_weight_g : (item.estimated_weight_g || 0);
          const goldWeight24k = wt * item.quantity * purityMultiplier;

          const sign = (division === '판매') ? 1 : -1; // 반품, DC는 매출 감산

          if (isCurrentMonth) {
            currentMonthRevenue += price * sign;
            currentMonthGold += goldWeight24k * sign;
          } else {
            prevMonthRevenue += price * sign;
            prevMonthGold += goldWeight24k * sign;
          }
        }
      }
    });
  });

  // Material inventory statistics mock definition
  // Calculate materials weight summary from actual orders for demonstrative statistics
  const materialStats = {
    gold24k: { weight: 0, count: 0 },
    gold18k: { weight: 0, count: 0 },
    gold14k: { weight: 0, count: 0 },
    silver: { weight: 0, count: 0 },
  };

  (orders || []).forEach(o => {
    if (!o || !o.items) return;
    o.items.forEach(item => {
      const weight = item.estimated_weight_g || 0;
      if (item.material === '24K') {
        materialStats.gold24k.weight += weight * item.quantity;
        materialStats.gold24k.count += item.quantity;
      } else if (item.material === '18K') {
        materialStats.gold18k.weight += weight * item.quantity;
        materialStats.gold18k.count += item.quantity;
      } else if (item.material === '14K') {
        materialStats.gold14k.weight += weight * item.quantity;
        materialStats.gold14k.count += item.quantity;
      } else {
        materialStats.silver.weight += weight * item.quantity;
        materialStats.silver.count += item.quantity;
      }
    });
  });

  // 세공 손실(해리) 무게 누적 계산
  let totalLossWeight = 0;
  const materialLossStats = {
    gold24k: { initialWeight: 0, lossWeight: 0 },
    gold18k: { initialWeight: 0, lossWeight: 0 },
    gold14k: { initialWeight: 0, lossWeight: 0 },
    silver: { initialWeight: 0, lossWeight: 0 },
  };

  (orders || []).forEach(o => {
    if (!o || !o.items) return;
    o.items.forEach(item => {
      if (item.step_weights) {
        const sw = item.step_weights;
        const before1 = sw.step1?.before || 0;
        const after1 = sw.step1?.after || 0;
        const before2 = sw.step2?.before || 0;
        const after2 = sw.step2?.after || 0;
        const before3 = sw.step3?.before || 0;
        const after3 = sw.step3?.after || 0;

        const loss1 = Math.max(0, before1 - after1);
        const loss2 = Math.max(0, before2 - after2);
        const loss3 = Math.max(0, before3 - after3);
        const totalItemLoss = loss1 + loss2 + loss3;
        
        let initialBefore = 0;
        if (before1 > 0) initialBefore = before1;
        else if (before2 > 0) initialBefore = before2;
        else if (before3 > 0) initialBefore = before3;

        const qty = item.quantity || 1;
        const itemLossTotal = totalItemLoss * qty;
        const itemInitialTotal = initialBefore * qty;

        totalLossWeight += itemLossTotal;

        if (item.material === '24K') {
          materialLossStats.gold24k.initialWeight += itemInitialTotal;
          materialLossStats.gold24k.lossWeight += itemLossTotal;
        } else if (item.material === '18K') {
          materialLossStats.gold18k.initialWeight += itemInitialTotal;
          materialLossStats.gold18k.lossWeight += itemLossTotal;
        } else if (item.material === '14K') {
          materialLossStats.gold14k.initialWeight += itemInitialTotal;
          materialLossStats.gold14k.lossWeight += itemLossTotal;
        } else {
          materialLossStats.silver.initialWeight += itemInitialTotal;
          materialLossStats.silver.lossWeight += itemLossTotal;
        }
      }
    });
  });



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="animate-fade-in">
      
      {/* 1. Live Gold Rate Sticky Bar */}
      {currentRates && (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '12px 20px', 
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(17, 19, 28, 0.9) 100%)', 
            borderLeft: '4px solid var(--primary)',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp style={{ color: 'var(--primary)' }} size={20} />
            <h3 style={{ fontSize: '18px', color: 'var(--text-main)' }}>
              실시간 당일 금 시세 <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>({currentRates.date} 기준)</span>
            </h3>
          </div>
          <div className="dashboard-rates-container" style={{ display: 'flex', gap: '24px', fontSize: '16px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>순금(24K) 매입/매도 (돈당):</span>{' '}
              <strong style={{ color: 'var(--primary)' }}>
                {currentRates.buy_rates.gold_24k_per_don.toLocaleString()}원
              </strong>
              {' / '}
              <strong style={{ color: '#ef4444' }}>
                {currentRates.sell_rates.gold_24k_per_don.toLocaleString()}원
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>18K 매입/매도 (g):</span>{' '}
              <strong>{currentRates.buy_rates.gold_18k_per_g.toLocaleString()}원</strong>
              {' / '}
              <strong>{currentRates.sell_rates.gold_18k_per_g.toLocaleString()}원</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>14K 매입/매도 (g):</span>{' '}
              <strong>{currentRates.buy_rates.gold_14k_per_g.toLocaleString()}원</strong>
              {' / '}
              <strong>{currentRates.sell_rates.gold_14k_per_g.toLocaleString()}원</strong>
            </div>
          </div>
        </div>
      )}

      {/* 2. Key Indicator Widgets (KPI Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        
        {/* Metric 1: Total Receivables (Gold + Cash) */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <DollarSign size={20} />
            </div>
            <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: '600' }}>전체 거래처 미수 잔고</span>
          </div>
          <div style={{ marginTop: '4px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>총 미수금액</div>
            <div style={{ fontSize: '25px', fontWeight: '700', fontFamily: 'var(--font-title)', color: '#ef4444' }}>
              {totalReceivable.toLocaleString()} 원
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>총 순금 미수량</div>
            <div style={{ fontSize: '21px', fontWeight: '700', fontFamily: 'var(--font-title)', color: 'var(--primary)', marginTop: '2px' }}>
              {totalGoldBalance24k.toLocaleString()} g
              <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: 'normal' }}>
                ({(totalGoldBalance24k / 3.75).toFixed(2)} 돈)
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Current Month Revenue (Gold + Cash) */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <TrendingUp size={20} />
            </div>
            <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: '600' }}>이번달 매출 실적 (당월)</span>
          </div>
          <div style={{ marginTop: '4px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>당월 확정 매출액</div>
            <div style={{ fontSize: '25px', fontWeight: '700', fontFamily: 'var(--font-title)', color: '#3b82f6' }}>
              {currentMonthRevenue.toLocaleString()} 원
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>당월 확정 금중량</div>
            <div style={{ fontSize: '21px', fontWeight: '700', fontFamily: 'var(--font-title)', color: 'var(--primary)', marginTop: '2px' }}>
              {parseFloat(currentMonthGold.toFixed(3)).toLocaleString()} g
              <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: 'normal' }}>
                ({(currentMonthGold / 3.75).toFixed(2)} 돈)
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Previous Month Revenue (Gold + Cash) */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(167, 139, 250, 0.1)', color: '#a78bfa' }}>
              <Calendar size={20} />
            </div>
            <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: '600' }}>지난달 매출 실적 (전월)</span>
          </div>
          <div style={{ marginTop: '4px' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>전월 확정 매출액</div>
            <div style={{ fontSize: '25px', fontWeight: '700', fontFamily: 'var(--font-title)', color: '#a78bfa' }}>
              {prevMonthRevenue.toLocaleString()} 원
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>전월 확정 금중량</div>
            <div style={{ fontSize: '21px', fontWeight: '700', fontFamily: 'var(--font-title)', color: 'var(--primary)', marginTop: '2px' }}>
              {parseFloat(prevMonthGold.toFixed(3)).toLocaleString()} g
              <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: 'normal' }}>
                ({(prevMonthGold / 3.75).toFixed(2)} 돈)
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: New Orders Count */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <Layers size={20} />
            </div>
            <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: '600' }}>당월 신규 주문 접수</span>
          </div>
          <div style={{ margin: 'auto 0' }}>
            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>접수 건수</div>
            <div style={{ fontSize: '35px', fontWeight: '800', fontFamily: 'var(--font-title)', color: '#10b981', marginTop: '4px' }}>
              {currentMonthOrders.length} <span style={{ fontSize: '19px', fontWeight: 'normal', color: 'var(--text-muted)' }}>건</span>
            </div>
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            이번 달 접수된 신규 오더 수량입니다.
          </div>
        </div>

      </div>

      {/* 3. Sub-stats section */}
      <div className="dashboard-charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', minHeight: '260px' }}>
        
        {/* Material Loss Summary */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          <h3 style={{ fontSize: '18px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} style={{ color: 'var(--primary)' }} />
            재질별 누적 세공 해리 총량
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', flex: 1 }}>
            
            {/* 24K Gold Loss Card */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '16px', color: 'var(--text-main)' }}>순금 (24K)</strong>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{materialStats.gold24k.count}개 작업</span>
                </div>
                <div style={{ fontSize: '23px', fontWeight: '700', fontFamily: 'var(--font-title)', color: '#fbbf24', marginTop: '10px' }}>
                  {materialLossStats.gold24k.lossWeight.toFixed(2)} <span style={{ fontSize: '15px', fontWeight: 'normal', color: 'var(--text-muted)' }}>g</span>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>평균 해리율</span>
                  <span style={{ color: '#fbbf24', fontWeight: '600' }}>
                    {materialLossStats.gold24k.initialWeight > 0 ? ((materialLossStats.gold24k.lossWeight / materialLossStats.gold24k.initialWeight) * 100).toFixed(2) : '0.00'}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.min(100, materialLossStats.gold24k.initialWeight > 0 ? (materialLossStats.gold24k.lossWeight / materialLossStats.gold24k.initialWeight) * 100 : 0)}%`, 
                    height: '100%', 
                    background: '#fbbf24',
                    borderRadius: '2px'
                  }} />
                </div>
              </div>
            </div>

            {/* 18K Gold Loss Card */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '16px', color: 'var(--text-main)' }}>18K 골드</strong>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{materialStats.gold18k.count}개 작업</span>
                </div>
                <div style={{ fontSize: '23px', fontWeight: '700', fontFamily: 'var(--font-title)', color: '#fbbf24', marginTop: '10px' }}>
                  {materialLossStats.gold18k.lossWeight.toFixed(2)} <span style={{ fontSize: '15px', fontWeight: 'normal', color: 'var(--text-muted)' }}>g</span>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>평균 해리율</span>
                  <span style={{ color: '#fbbf24', fontWeight: '600' }}>
                    {materialLossStats.gold18k.initialWeight > 0 ? ((materialLossStats.gold18k.lossWeight / materialLossStats.gold18k.initialWeight) * 100).toFixed(2) : '0.00'}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.min(100, materialLossStats.gold18k.initialWeight > 0 ? (materialLossStats.gold18k.lossWeight / materialLossStats.gold18k.initialWeight) * 100 : 0)}%`, 
                    height: '100%', 
                    background: '#fbbf24',
                    borderRadius: '2px'
                  }} />
                </div>
              </div>
            </div>

            {/* 14K Gold Loss Card */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '16px', color: 'var(--text-main)' }}>14K 골드</strong>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{materialStats.gold14k.count}개 작업</span>
                </div>
                <div style={{ fontSize: '23px', fontWeight: '700', fontFamily: 'var(--font-title)', color: '#fbbf24', marginTop: '10px' }}>
                  {materialLossStats.gold14k.lossWeight.toFixed(2)} <span style={{ fontSize: '15px', fontWeight: 'normal', color: 'var(--text-muted)' }}>g</span>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>평균 해리율</span>
                  <span style={{ color: '#fbbf24', fontWeight: '600' }}>
                    {materialLossStats.gold14k.initialWeight > 0 ? ((materialLossStats.gold14k.lossWeight / materialLossStats.gold14k.initialWeight) * 100).toFixed(2) : '0.00'}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.min(100, materialLossStats.gold14k.initialWeight > 0 ? (materialLossStats.gold14k.lossWeight / materialLossStats.gold14k.initialWeight) * 100 : 0)}%`, 
                    height: '100%', 
                    background: '#fbbf24',
                    borderRadius: '2px'
                  }} />
                </div>
              </div>
            </div>

            {/* Silver / Others Loss Card */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '16px', color: 'var(--text-main)' }}>실버 / 기타</strong>
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{materialStats.silver.count}개 작업</span>
                </div>
                <div style={{ fontSize: '23px', fontWeight: '700', fontFamily: 'var(--font-title)', color: '#fbbf24', marginTop: '10px' }}>
                  {materialLossStats.silver.lossWeight.toFixed(2)} <span style={{ fontSize: '15px', fontWeight: 'normal', color: 'var(--text-muted)' }}>g</span>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  <span>평균 해리율</span>
                  <span style={{ color: '#fbbf24', fontWeight: '600' }}>
                    {materialLossStats.silver.initialWeight > 0 ? ((materialLossStats.silver.lossWeight / materialLossStats.silver.initialWeight) * 100).toFixed(2) : '0.00'}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.min(100, materialLossStats.silver.initialWeight > 0 ? (materialLossStats.silver.lossWeight / materialLossStats.silver.initialWeight) * 100 : 0)}%`, 
                    height: '100%', 
                    background: '#fbbf24',
                    borderRadius: '2px'
                  }} />
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
