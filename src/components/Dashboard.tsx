// src/components/Dashboard.tsx
import React from 'react';
import { useErpStore } from '../store/useErpStore';
import { TrendingUp, Layers, DollarSign } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { currentRates, totalReceivable, totalGoldBalance24k, orders } = useErpStore();

  // 당월 매출 및 주문 건수 동적 계산
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthOrders = (orders || []).filter(o => o.order_date && o.order_date.startsWith(currentYearMonth));
  const currentMonthRevenue = currentMonthOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

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
            <h3 style={{ fontSize: '15px', color: 'var(--text-main)' }}>
              실시간 당일 금 시세 <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({currentRates.date} 기준)</span>
            </h3>
          </div>
          <div className="dashboard-rates-container" style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
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
        
        {/* Metric 1: Total Gold Balance Ledger */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(212, 175, 55, 0.1)', color: 'var(--primary)' }}>
            <Layers size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>전체 거래처 순금 미수 총량</div>
            <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--font-title)', color: 'var(--primary)', marginTop: '4px' }}>
              {totalGoldBalance24k.toLocaleString()} g
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: 'normal' }}>
                ({(totalGoldBalance24k / 3.75).toFixed(2)} 돈)
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Total Money Receivable */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>전체 거래처 미수금액 총합</div>
            <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--font-title)', color: '#ef4444', marginTop: '4px' }}>
              {totalReceivable.toLocaleString()} 원
            </div>
          </div>
        </div>

        {/* Metric 3: Active Orders Count */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>당월 신규 주문 접수 건수</div>
            <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--font-title)', color: '#10b981', marginTop: '4px' }}>
              {currentMonthOrders.length} 건
            </div>
          </div>
        </div>

        {/* Metric 4: Current Month Revenue */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500' }}>당월 신규 주문 매출 총액</div>
            <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--font-title)', color: '#3b82f6', marginTop: '4px' }}>
              {currentMonthRevenue.toLocaleString()} 원
            </div>
          </div>
        </div>


      </div>

      {/* 3. Sub-stats section */}
      <div className="dashboard-charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', minHeight: '320px' }}>
        
        {/* Material Inventory Summary */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '15px', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            재질별 누적 세공 해리 총량
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'space-around' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>순금 (24K)</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{materialStats.gold24k.count}개 작업 완료</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  평균 해리율: <span style={{ color: '#fbbf24', fontWeight: '600' }}>{materialLossStats.gold24k.initialWeight > 0 ? ((materialLossStats.gold24k.lossWeight / materialLossStats.gold24k.initialWeight) * 100).toFixed(2) : '0.00'}%</span>
                </div>
              </div>
              <span style={{ fontSize: '15px', fontWeight: '700', fontFamily: 'var(--font-title)', color: '#fbbf24', paddingTop: '2px' }}>
                {materialLossStats.gold24k.lossWeight.toFixed(2)} g
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>18K 골드</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{materialStats.gold18k.count}개 작업 완료</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  평균 해리율: <span style={{ color: '#fbbf24', fontWeight: '600' }}>{materialLossStats.gold18k.initialWeight > 0 ? ((materialLossStats.gold18k.lossWeight / materialLossStats.gold18k.initialWeight) * 100).toFixed(2) : '0.00'}%</span>
                </div>
              </div>
              <span style={{ fontSize: '15px', fontWeight: '700', fontFamily: 'var(--font-title)', color: '#fbbf24', paddingTop: '2px' }}>
                {materialLossStats.gold18k.lossWeight.toFixed(2)} g
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>14K 골드</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{materialStats.gold14k.count}개 작업 완료</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  평균 해리율: <span style={{ color: '#fbbf24', fontWeight: '600' }}>{materialLossStats.gold14k.initialWeight > 0 ? ((materialLossStats.gold14k.lossWeight / materialLossStats.gold14k.initialWeight) * 100).toFixed(2) : '0.00'}%</span>
                </div>
              </div>
              <span style={{ fontSize: '15px', fontWeight: '700', fontFamily: 'var(--font-title)', color: '#fbbf24', paddingTop: '2px' }}>
                {materialLossStats.gold14k.lossWeight.toFixed(2)} g
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '4px' }}>
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>실버 / 기타</strong>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{materialStats.silver.count}개 작업 완료</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  평균 해리율: <span style={{ color: '#fbbf24', fontWeight: '600' }}>{materialLossStats.silver.initialWeight > 0 ? ((materialLossStats.silver.lossWeight / materialLossStats.silver.initialWeight) * 100).toFixed(2) : '0.00'}%</span>
                </div>
              </div>
              <span style={{ fontSize: '15px', fontWeight: '700', fontFamily: 'var(--font-title)', color: '#fbbf24', paddingTop: '2px' }}>
                {materialLossStats.silver.lossWeight.toFixed(2)} g
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
