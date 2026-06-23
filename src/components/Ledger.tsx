// src/components/Ledger.tsx
import React, { useState } from 'react';
import { useErpStore } from '../store/useErpStore';
import type { Customer } from '../firebase/mockDb';
import { Landmark, ArrowDownCircle, ShieldCheck, FileSpreadsheet } from 'lucide-react';

export const Ledger: React.FC = () => {
  const { customers, orders, addGoldPayment, updateOrderStatus } = useErpStore();
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [weight, setWeight] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [showPayModal, setShowPayModal] = useState<boolean>(false);

  const openPayModal = (customer: Customer) => {
    setSelectedCust(customer);
    setWeight('');
    setNote('');
    setShowPayModal(true);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust || !weight) return;

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      alert('올바른 입고 중량(g)을 입력해 주세요.');
      return;
    }

    addGoldPayment(selectedCust.customer_id, weightNum, note);
    alert(`${selectedCust.name} 거래처의 순금 미수 중량이 ${weightNum}g 차감되었습니다.`);
    setShowPayModal(false);
    setSelectedCust(null);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }} className="animate-fade-in">
      
      {/* 1. Customer Ledger List */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <Landmark size={18} style={{ color: 'var(--primary)' }} />
          거래처 미수금 및 순금 장부 관리
        </h2>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px' }}>상호명</th>
                <th style={{ padding: '8px', width: '80px' }}>등급</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>순금 미수 중량</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>미수 금액</th>
                <th style={{ padding: '8px', width: '150px', textAlign: 'center' }}>미수 정산</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.customer_id} style={{ borderBottom: '1px solid var(--border-color)', height: '44px' }}>
                  <td style={{ padding: '8px', fontWeight: '600' }}>{c.name}</td>
                  <td style={{ padding: '8px' }}>
                    <span className="badge badge-warning" style={{ fontSize: '11px' }}>{c.grade}등급</span>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-title)', color: 'var(--primary)', fontWeight: '600' }}>
                    {c.gold_balance_24k_g.toLocaleString()} g
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-title)', color: '#ef4444', fontWeight: '600' }}>
                    {c.receivable_amount.toLocaleString()} 원
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <button 
                      onClick={() => openPayModal(c)}
                      className="btn-primary"
                      style={{ fontSize: '11px', padding: '4px 10px', boxShadow: 'none' }}
                    >
                      <ArrowDownCircle size={12} /> 실물 금 입고
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Order History & Status Management */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <FileSpreadsheet size={18} style={{ color: 'var(--primary)' }} />
          최근 주문 현황 및 상태 제어
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
          {orders.map(o => (
            <div 
              key={o.order_id} 
              style={{ 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px', 
                padding: '12px',
                background: 'rgba(255, 255, 255, 0.01)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-title)', fontWeight: '600', color: 'var(--primary)' }}>
                  {o.order_id}
                </span>
                <select
                  value={o.status}
                  onChange={(e) => updateOrderStatus(o.order_id, e.target.value as any)}
                  className="input-field"
                  style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--bg-surface-solid)' }}
                >
                  <option value="접수">접수</option>
                  <option value="공장발주">공장발주</option>
                  <option value="출고대기">출고대기</option>
                  <option value="출고완료">출고완료</option>
                  <option value="보류">보류</option>
                </select>
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600' }}>
                {o.customer_snapshot.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {o.items.map(i => `${i.model_number} (${i.material}/${i.color} ${i.size}) x${i.quantity}`).join(', ')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                <span>금액: <strong>{o.total_amount.toLocaleString()}원</strong></span>
                <span>환산순금: <strong>{o.total_gold_weight_24k_g}g</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Gold Inflow (Payment) Modal Pop-up */}
      {showPayModal && selectedCust && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          backdropFilter: 'blur(4px)'
        }}>
          <div 
            className="glass-panel animate-fade-in" 
            style={{ 
              width: '400px', 
              background: 'var(--bg-surface-solid)', 
              border: '1px solid var(--primary)', 
              boxShadow: '0 0 24px rgba(212, 175, 55, 0.15)'
            }}
          >
            <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <ShieldCheck size={18} style={{ color: 'var(--primary)' }} />
              실물 순금 입고 정산
            </h3>
            
            <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>대상 거래처</label>
                <div style={{ fontSize: '14px', fontWeight: '700' }}>{selectedCust.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>현재 미수금: {selectedCust.gold_balance_24k_g} g</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>정산할 실물 금 중량 (g)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>상세 비고 (입고 내역)</label>
                <input
                  type="text"
                  placeholder="예: 종로공장 실물 골드바 정산"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="btn-primary"
                  style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-main)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
                >
                  취소
                </button>
                <button type="submit" className="btn-primary">
                  장부 정산 승인
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
