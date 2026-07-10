// src/components/RatesManager.tsx
import React, { useState } from 'react';
import { useErpStore } from '../store/useErpStore';
import type { GoldRates } from '../firebase/mockDb';
import { Coins, PlusCircle, History, Landmark } from 'lucide-react';

export const RatesManager: React.FC = () => {
  const { goldRates, updateGoldRate, currentRates } = useErpStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  
  // Buy rates state (앞시세)
  const [buy24kG, setBuy24kG] = useState<string>(currentRates?.buy_rates.gold_24k_per_g.toString() || '0');
  const [buy24kDon, setBuy24kDon] = useState<string>(currentRates?.buy_rates.gold_24k_per_don.toString() || '0');
  const [buy18kG, setBuy18kG] = useState<string>(currentRates?.buy_rates.gold_18k_per_g.toString() || '0');
  const [buy14kG, setBuy14kG] = useState<string>(currentRates?.buy_rates.gold_14k_per_g.toString() || '0');
  const [buySilverG, setBuySilverG] = useState<string>(currentRates?.buy_rates.silver_per_g.toString() || '0');

  // Sell rates state (뒷시세)
  const [sell24kG, setSell24kG] = useState<string>(currentRates?.sell_rates.gold_24k_per_g.toString() || '0');
  const [sell24kDon, setSell24kDon] = useState<string>(currentRates?.sell_rates.gold_24k_per_don.toString() || '0');
  const [sell18kG, setSell18kG] = useState<string>(currentRates?.sell_rates.gold_18k_per_g.toString() || '0');
  const [sell14kG, setSell14kG] = useState<string>(currentRates?.sell_rates.gold_14k_per_g.toString() || '0');
  const [sellSilverG, setSellSilverG] = useState<string>(currentRates?.sell_rates.silver_per_g.toString() || '0');

  // 1,000단위 콤마 포맷 헬퍼 함수
  const formatWithComma = (val: string) => {
    if (!val) return '';
    const clean = val.replace(/,/g, '');
    if (isNaN(Number(clean))) return val;
    
    if (clean.endsWith('.')) {
      const numPart = parseInt(clean.slice(0, -1), 10) || 0;
      return `${numPart.toLocaleString()}.`;
    }
    
    const parts = clean.split('.');
    const intPart = parseInt(parts[0], 10) || 0;
    if (parts.length > 1) {
      return `${intPart.toLocaleString()}.${parts[1]}`;
    }
    return intPart.toLocaleString();
  };

  // Auto conversion helper (1 don = 3.75 g)
  const handleBuy24kChange = (val: string, unit: 'g' | 'don') => {
    const cleanVal = val.replace(/,/g, '');
    const num = parseFloat(cleanVal) || 0;
    if (unit === 'g') {
      setBuy24kG(cleanVal);
      setBuy24kDon(Math.round(num * 3.75).toString());
      setBuy18kG(Math.round(num * 0.75).toString());
      setBuy14kG(Math.round(num * 0.585).toString());
    } else {
      setBuy24kDon(cleanVal);
      const calculatedG = parseFloat((num / 3.75).toFixed(2));
      setBuy24kG(calculatedG.toString());
      setBuy18kG(Math.round(calculatedG * 0.75).toString());
      setBuy14kG(Math.round(calculatedG * 0.585).toString());
    }
  };

  const handleSell24kChange = (val: string, unit: 'g' | 'don') => {
    const cleanVal = val.replace(/,/g, '');
    const num = parseFloat(cleanVal) || 0;
    if (unit === 'g') {
      setSell24kG(cleanVal);
      setSell24kDon(Math.round(num * 3.75).toString());
      setSell18kG(Math.round(num * 0.75).toString());
      setSell14kG(Math.round(num * 0.585).toString());
    } else {
      setSell24kDon(cleanVal);
      const calculatedG = parseFloat((num / 3.75).toFixed(2));
      setSell24kG(calculatedG.toString());
      setSell18kG(Math.round(calculatedG * 0.75).toString());
      setSell14kG(Math.round(calculatedG * 0.585).toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newRates: GoldRates = {
      date,
      buy_rates: {
        gold_24k_per_g: parseFloat(buy24kG) || 0,
        gold_18k_per_g: parseFloat(buy18kG) || 0,
        gold_14k_per_g: parseFloat(buy14kG) || 0,
        silver_per_g: parseFloat(buySilverG) || 0,
        gold_24k_per_don: parseFloat(buy24kDon) || 0,
      },
      sell_rates: {
        gold_24k_per_g: parseFloat(sell24kG) || 0,
        gold_18k_per_g: parseFloat(sell18kG) || 0,
        gold_14k_per_g: parseFloat(sell14kG) || 0,
        silver_per_g: parseFloat(sellSilverG) || 0,
        gold_24k_per_don: parseFloat(sell24kDon) || 0,
      },
      updated_at: new Date().toISOString(),
      updated_by: 'admin_user',
    };

    updateGoldRate(newRates);
    alert(`${date} 일자 금 시세가 성공적으로 등록/수정되었습니다.`);
    setIsFormOpen(false);
  };

  return (
    <>
      {isFormOpen && <div className="mobile-backdrop" onClick={() => setIsFormOpen(false)} />}
      <div className="rates-manager-grid">
        
        {/* 1. Gold Rate Registration Form */}
        <div 
          className={`glass-panel rates-form-panel animate-fade-in ${isFormOpen ? 'mobile-show' : 'mobile-hide'}`}
          onClick={(e) => e.stopPropagation()}
        >
        <h2 style={{ fontSize: '19px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', width: '100%' }}>
          <Coins size={18} style={{ color: 'var(--primary)' }} />
          금 시세
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          
          {/* Target Date Input */}
          <div style={{ width: '100%' }}>
            <label style={{ display: 'block', fontSize: '15px', color: 'var(--text-muted)', marginBottom: '4px' }}>적용 일자</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="input-field" 
              style={{ width: '100%', maxWidth: '200px' }}
              required 
            />
          </div>

          <div className="rates-cards-grid">
            
            {/* Left: Buy Rates (앞시세 - 매입) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.01)' }}>
              <h3 style={{ fontSize: '17px', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Landmark size={14} /> 앞시세 (매입/소매매입)
              </h3>
              
              <div className="rates-card-inputs-grid">
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '2px' }}>24K 순금 돈당 금액 (3.75g)</label>
                  <input 
                    type="text" 
                    value={formatWithComma(buy24kDon)} 
                    onChange={(e) => handleBuy24kChange(e.target.value, 'don')} 
                    className="input-field" 
                    style={{ width: '100%', textAlign: 'right' }} 
                    required 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '2px' }}>24K 순금 그람당 금액 (g)</label>
                  <input 
                    type="text" 
                    value={formatWithComma(buy24kG)} 
                    onChange={(e) => handleBuy24kChange(e.target.value, 'g')} 
                    className="input-field" 
                    style={{ width: '100%', textAlign: 'right' }} 
                    required 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '2px' }}>18K 그람당 금액 (g)</label>
                  <input 
                    type="text" 
                    value={formatWithComma(buy18kG)} 
                    onChange={(e) => setBuy18kG(e.target.value.replace(/,/g, ''))} 
                    className="input-field" 
                    style={{ width: '100%', textAlign: 'right' }} 
                    required 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '2px' }}>14K 그람당 금액 (g)</label>
                  <input 
                    type="text" 
                    value={formatWithComma(buy14kG)} 
                    onChange={(e) => setBuy14kG(e.target.value.replace(/,/g, ''))} 
                    className="input-field" 
                    style={{ width: '100%', textAlign: 'right' }} 
                    required 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '2px' }}>은(Silver) 그람당 금액 (g)</label>
                  <input 
                    type="text" 
                    value={formatWithComma(buySilverG)} 
                    onChange={(e) => setBuySilverG(e.target.value.replace(/,/g, ''))} 
                    className="input-field" 
                    style={{ width: '100%', textAlign: 'right' }} 
                    required 
                  />
                </div>
              </div>
            </div>

            {/* Right: Sell Rates (뒷시세 - 매도/출고) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.01)' }}>
              <h3 style={{ fontSize: '17px', color: '#ef4444', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Landmark size={14} /> 뒷시세 (매도/공장도매출고)
              </h3>
              
              <div className="rates-card-inputs-grid">
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '2px' }}>24K 순금 돈당 금액 (3.75g)</label>
                  <input 
                    type="text" 
                    value={formatWithComma(sell24kDon)} 
                    onChange={(e) => handleSell24kChange(e.target.value, 'don')} 
                    className="input-field" 
                    style={{ width: '100%', textAlign: 'right' }} 
                    required 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '2px' }}>24K 순금 그람당 금액 (g)</label>
                  <input 
                    type="text" 
                    value={formatWithComma(sell24kG)} 
                    onChange={(e) => handleSell24kChange(e.target.value, 'g')} 
                    className="input-field" 
                    style={{ width: '100%', textAlign: 'right' }} 
                    required 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '2px' }}>18K 그람당 금액 (g)</label>
                  <input 
                    type="text" 
                    value={formatWithComma(sell18kG)} 
                    onChange={(e) => setSell18kG(e.target.value.replace(/,/g, ''))} 
                    className="input-field" 
                    style={{ width: '100%', textAlign: 'right' }} 
                    required 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '2px' }}>14K 그람당 금액 (g)</label>
                  <input 
                    type="text" 
                    value={formatWithComma(sell14kG)} 
                    onChange={(e) => setSell14kG(e.target.value.replace(/,/g, ''))} 
                    className="input-field" 
                    style={{ width: '100%', textAlign: 'right' }} 
                    required 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '2px' }}>은(Silver) 그람당 금액 (g)</label>
                  <input 
                    type="text" 
                    value={formatWithComma(sellSilverG)} 
                    onChange={(e) => setSellSilverG(e.target.value.replace(/,/g, ''))} 
                    className="input-field" 
                    style={{ width: '100%', textAlign: 'right' }} 
                    required 
                  />
                </div>
              </div>
            </div>

          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '8px' }}>
            <button 
              type="button" 
              className="btn-primary mobile-cancel-btn" 
              onClick={() => setIsFormOpen(false)}
              style={{ background: 'rgba(15,23,42,0.03)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', boxShadow: 'none', justifyContent: 'center' }}
            >
              취소
            </button>
            <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>
              <PlusCircle size={16} /> 금일 시세 등록
            </button>
          </div>
        </form>
      </div>

      {/* 2. Gold Rates History Ledger */}
      <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={18} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '18px', fontWeight: '600', fontFamily: 'var(--font-title)' }}>과거 금 시세 이력 (History)</h2>
            <button
              className="btn-primary mobile-customer-add-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsFormOpen(true);
              }}
              style={{ padding: '4px 10px', fontSize: '14px', boxShadow: 'none' }}
            >
              <PlusCircle size={12} />
              <span>시세 등록</span>
            </button>
          </div>
        </div>

        <div className="table-responsive" style={{ overflowY: 'auto', maxHeight: '480px', marginBottom: 0 }}>
          <table style={{ width: '100%', minWidth: '550px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', height: '28px' }}>
                <th rowSpan={2} style={{ padding: '6px', verticalAlign: 'middle', borderRight: '1px solid var(--border-color)', textAlign: 'center' }}>일자</th>
                <th colSpan={2} style={{ padding: '4px', textAlign: 'center', borderRight: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>앞시세</th>
                <th colSpan={2} style={{ padding: '4px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>뒷시세</th>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', height: '28px' }}>
                <th style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid var(--border-color)' }}>G당</th>
                <th style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid var(--border-color)' }}>돈당</th>
                <th style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid var(--border-color)' }}>G당</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>돈당</th>
              </tr>
            </thead>
            <tbody>
              {[...goldRates].sort((a, b) => b.date.localeCompare(a.date)).map(r => (
                <tr key={r.date} style={{ borderBottom: '1px solid var(--border-color)', height: '36px' }}>
                  <td style={{ padding: '6px', fontWeight: '600', borderRight: '1px solid var(--border-color)', textAlign: 'center' }}>{r.date}</td>
                  <td style={{ padding: '6px', textAlign: 'right', color: 'var(--primary)', fontFamily: 'var(--font-title)', borderRight: '1px solid var(--border-color)' }}>
                    {(r.buy_rates.gold_24k_per_g || 0).toLocaleString()}원
                  </td>
                  <td style={{ padding: '6px', textAlign: 'right', color: 'var(--primary)', fontFamily: 'var(--font-title)', borderRight: '1px solid var(--border-color)' }}>
                    {(r.buy_rates.gold_24k_per_don || 0).toLocaleString()}원
                  </td>
                  <td style={{ padding: '6px', textAlign: 'right', color: '#ef4444', fontFamily: 'var(--font-title)', borderRight: '1px solid var(--border-color)' }}>
                    {(r.sell_rates.gold_24k_per_g || 0).toLocaleString()}원
                  </td>
                  <td style={{ padding: '6px', textAlign: 'right', color: '#ef4444', fontFamily: 'var(--font-title)' }}>
                    {(r.sell_rates.gold_24k_per_don || 0).toLocaleString()}원
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      </div>
    </>
  );
};
