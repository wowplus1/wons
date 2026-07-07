// src/components/Ledger.tsx
import React, { useState, useMemo } from 'react';
import { useErpStore } from '../store/useErpStore';
import type { Customer, Order } from '../firebase/mockDb';
import { Landmark, ArrowDownCircle, ShieldCheck, ChevronDown, ChevronRight, Users, ListFilter, FileSpreadsheet, X } from 'lucide-react';

type ViewMode = 'all' | 'by-customer';

export const Ledger: React.FC = () => {
  const { customers, orders, addGoldPayment } = useErpStore();
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [weight, setWeight] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [showPayModal, setShowPayModal] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [focusedCustomerId, setFocusedCustomerId] = useState<string | null>(null);

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

  // 거래처별 주문 목록 map
  const ordersByCustomer = useMemo(() => {
    const map: Record<string, Order[]> = {};
    orders.forEach(o => {
      const cid = o.customer_snapshot.customer_id;
      if (!map[cid]) map[cid] = [];
      map[cid].push(o);
    });
    // 날짜 내림차순 정렬
    Object.keys(map).forEach(cid => {
      map[cid].sort((a, b) => b.order_date.localeCompare(a.order_date));
    });
    return map;
  }, [orders]);

  // 포커스된 거래처의 주문
  const focusedOrders = useMemo(() => {
    if (!focusedCustomerId) return [];
    return ordersByCustomer[focusedCustomerId] ?? [];
  }, [focusedCustomerId, ordersByCustomer]);

  const focusedCustomer = useMemo(() => {
    return customers.find(c => c.customer_id === focusedCustomerId) ?? null;
  }, [focusedCustomerId, customers]);

  const toggleExpand = (customerId: string) => {
    setExpandedCustomerId(prev => prev === customerId ? null : customerId);
    setFocusedCustomerId(customerId);
  };

  const statusColor = (status: Order['status']) => {
    switch (status) {
      case '출고완료': return '#10b981';
      case '출고대기': return '#3b82f6';
      case '공장발주': return '#f59e0b';
      case '보류': return '#ef4444';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }} className="animate-fade-in">

      {/* 상단 타이틀 + 뷰 전환 탭 */}
      <div className="glass-panel" style={{
        padding: '14px 20px',
        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, var(--bg-surface-solid) 100%)',
        borderLeft: '4px solid var(--primary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Landmark size={20} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '19px', color: 'var(--text-main)', margin: 0, fontWeight: '700' }}>
            거래처 미수 장부
          </h3>
        </div>
        {/* 뷰 전환 버튼 */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { setViewMode('all'); setFocusedCustomerId(null); setExpandedCustomerId(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: '600',
              border: viewMode === 'all' ? '1.5px solid var(--primary)' : '1.5px solid var(--border-color)',
              background: viewMode === 'all' ? 'rgba(212,175,55,0.12)' : 'transparent',
              color: viewMode === 'all' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <ListFilter size={14} /> 전체 목록
          </button>
          <button
            onClick={() => setViewMode('by-customer')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: '600',
              border: viewMode === 'by-customer' ? '1.5px solid var(--primary)' : '1.5px solid var(--border-color)',
              background: viewMode === 'by-customer' ? 'rgba(212,175,55,0.12)' : 'transparent',
              color: viewMode === 'by-customer' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <Users size={14} /> 거래처별 보기
          </button>
        </div>
      </div>

      {/* ── 전체 목록 모드 ── */}
      {viewMode === 'all' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px' }}>
          {/* 거래처 미수 테이블 */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <Landmark size={16} style={{ color: 'var(--primary)' }} />
              거래처 미수금 현황
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px' }}>상호명</th>
                    <th style={{ padding: '8px', width: '70px' }}>등급</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>순금 미수</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>미수 금액</th>
                    <th style={{ padding: '8px', width: '130px', textAlign: 'center' }}>정산</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(c => (
                    <tr key={c.customer_id} style={{ borderBottom: '1px solid var(--border-color)', height: '44px' }}>
                      <td style={{ padding: '8px', fontWeight: '600' }}>{c.name}</td>
                      <td style={{ padding: '8px' }}>
                        <span className="badge badge-warning" style={{ fontSize: '13px' }}>{c.grade}등급</span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-title)', color: c.gold_balance_24k_g < 0 ? '#10b981' : 'var(--primary)', fontWeight: '600' }}>
                        {c.gold_balance_24k_g < 0
                          ? `선수 ${Math.abs(c.gold_balance_24k_g).toFixed(3)}g`
                          : `${c.gold_balance_24k_g.toFixed(3)}g`}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-title)', color: c.receivable_amount < 0 ? '#10b981' : c.receivable_amount > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: '600' }}>
                        {c.receivable_amount < 0
                          ? `선수 ${Math.abs(c.receivable_amount).toLocaleString()}원`
                          : `${c.receivable_amount.toLocaleString()}원`}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'center' }}>
                        <button onClick={() => openPayModal(c)} className="btn-primary" style={{ fontSize: '13px', padding: '4px 10px', boxShadow: 'none' }}>
                          <ArrowDownCircle size={11} /> 금 입고
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 최근 주문 목록 */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <FileSpreadsheet size={16} style={{ color: 'var(--primary)' }} />
              최근 주문 현황
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '420px', paddingRight: '4px' }}>
              {orders.slice(0, 20).map(o => (
                <div key={o.order_id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontFamily: 'var(--font-title)', fontWeight: '600', color: 'var(--primary)' }}>{o.order_id}</span>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: statusColor(o.status) }}>{o.status}</span>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: '600' }}>{o.customer_snapshot.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{o.order_date}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '2px' }}>
                    <span>금액: <strong>{o.total_amount.toLocaleString()}원</strong></span>
                    <span>순금: <strong>{o.total_gold_weight_24k_g}g</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 거래처별 보기 모드 ── */}
      {viewMode === 'by-customer' && (
        <div style={{ display: 'grid', gridTemplateColumns: focusedCustomerId ? '1fr 1.4fr' : '1fr', gap: '16px' }}>

          {/* 거래처 아코디언 목록 */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <h2 style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '4px' }}>
              <Users size={16} style={{ color: 'var(--primary)' }} />
              거래처별 미수 현황 <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '400' }}>({customers.length}개)</span>
            </h2>

            <div style={{ overflowY: 'auto', maxHeight: '600px' }}>
              {customers.map(c => {
                const custOrders = ordersByCustomer[c.customer_id] ?? [];
                const isExpanded = expandedCustomerId === c.customer_id;
                const isFocused = focusedCustomerId === c.customer_id;
                return (
                  <div key={c.customer_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {/* 거래처 행 */}
                    <div
                      onClick={() => toggleExpand(c.customer_id)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '20px 1fr auto auto 110px',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 8px',
                        cursor: 'pointer',
                        background: isFocused ? 'rgba(212,175,55,0.07)' : 'transparent',
                        borderLeft: isFocused ? '3px solid var(--primary)' : '3px solid transparent',
                        transition: 'all 0.15s'
                      }}
                    >
                      {isExpanded
                        ? <ChevronDown size={15} style={{ color: 'var(--primary)' }} />
                        : <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} />}
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '15px' }}>{c.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {c.grade}등급 · 주문 {custOrders.length}건
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: '600', color: c.gold_balance_24k_g < 0 ? '#10b981' : 'var(--primary)' }}>
                        {c.gold_balance_24k_g < 0
                          ? `선수 ${Math.abs(c.gold_balance_24k_g).toFixed(2)}g`
                          : `${c.gold_balance_24k_g.toFixed(2)}g`}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '13px', fontWeight: '600', color: c.receivable_amount < 0 ? '#10b981' : c.receivable_amount > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                        {c.receivable_amount < 0
                          ? `선수 ${Math.abs(c.receivable_amount).toLocaleString()}원`
                          : `${c.receivable_amount.toLocaleString()}원`}
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); openPayModal(c); }}
                          className="btn-primary"
                          style={{ fontSize: '12px', padding: '4px 8px', boxShadow: 'none' }}
                        >
                          <ArrowDownCircle size={11} /> 금 입고
                        </button>
                      </div>
                    </div>

                    {/* 주문 목록 아코디언 펼침 */}
                    {isExpanded && (
                      <div style={{ background: 'rgba(0,0,0,0.15)', padding: '8px 12px 12px 32px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {custOrders.length === 0 ? (
                          <div style={{ color: 'var(--text-muted)', fontSize: '13px', padding: '8px 0' }}>주문 내역이 없습니다.</div>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                              <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '4px 6px', textAlign: 'left' }}>주문번호</th>
                                <th style={{ padding: '4px 6px', textAlign: 'left' }}>주문일</th>
                                <th style={{ padding: '4px 6px', textAlign: 'center' }}>상태</th>
                                <th style={{ padding: '4px 6px', textAlign: 'right' }}>금액</th>
                                <th style={{ padding: '4px 6px', textAlign: 'right' }}>순금(g)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {custOrders.map(o => (
                                <tr key={o.order_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', height: '32px' }}>
                                  <td style={{ padding: '4px 6px', fontFamily: 'var(--font-title)', color: 'var(--primary)', fontWeight: '600' }}>{o.order_id}</td>
                                  <td style={{ padding: '4px 6px', color: 'var(--text-muted)' }}>{o.order_date}</td>
                                  <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: statusColor(o.status) }}>{o.status}</span>
                                  </td>
                                  <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: '600' }}>{o.total_amount.toLocaleString()}원</td>
                                  <td style={{ padding: '4px 6px', textAlign: 'right', color: 'var(--primary)', fontWeight: '600' }}>{o.total_gold_weight_24k_g}g</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr style={{ borderTop: '1px solid var(--border-color)', fontWeight: '700', color: 'var(--text-main)' }}>
                                <td colSpan={3} style={{ padding: '6px 6px', fontSize: '12px', color: 'var(--text-muted)' }}>합계</td>
                                <td style={{ padding: '6px 6px', textAlign: 'right', color: '#ef4444' }}>
                                  {custOrders.reduce((s, o) => s + o.total_amount, 0).toLocaleString()}원
                                </td>
                                <td style={{ padding: '6px 6px', textAlign: 'right', color: 'var(--primary)' }}>
                                  {custOrders.reduce((s, o) => s + o.total_gold_weight_24k_g, 0).toFixed(3)}g
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 선택된 거래처 상세 패널 */}
          {focusedCustomerId && focusedCustomer && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 거래처 요약 카드 */}
              <div className="glass-panel" style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.1) 0%, var(--bg-surface-solid) 100%)',
                borderLeft: '4px solid var(--primary)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>{focusedCustomer.name}</h3>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{focusedCustomer.grade}등급 · {focusedCustomer.trade_type === 'weight' ? '중량거래' : '시세거래'}</span>
                  </div>
                  <button
                    onClick={() => { setFocusedCustomerId(null); setExpandedCustomerId(null); }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                  >
                    <X size={18} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: 'rgba(212,175,55,0.08)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>순금 미수 중량</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: focusedCustomer.gold_balance_24k_g < 0 ? '#10b981' : 'var(--primary)' }}>
                      {focusedCustomer.gold_balance_24k_g < 0
                        ? `선수 ${Math.abs(focusedCustomer.gold_balance_24k_g).toFixed(3)}g`
                        : `${focusedCustomer.gold_balance_24k_g.toFixed(3)}g`}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(239,68,68,0.07)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>미수 금액</div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: focusedCustomer.receivable_amount < 0 ? '#10b981' : focusedCustomer.receivable_amount > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                      {focusedCustomer.receivable_amount < 0
                        ? `선수 ${Math.abs(focusedCustomer.receivable_amount).toLocaleString()}원`
                        : `${focusedCustomer.receivable_amount.toLocaleString()}원`}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                  <button onClick={() => openPayModal(focusedCustomer)} className="btn-primary" style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ArrowDownCircle size={14} /> 실물 금 입고 정산
                  </button>
                </div>
              </div>

              {/* 이 거래처의 주문 상세 목록 */}
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', margin: 0 }}>
                  <FileSpreadsheet size={15} style={{ color: 'var(--primary)' }} />
                  주문 내역 ({focusedOrders.length}건)
                </h3>
                <div style={{ overflowY: 'auto', maxHeight: '360px', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                  {focusedOrders.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0', fontSize: '14px' }}>주문 내역이 없습니다.</div>
                  ) : (
                    focusedOrders.map(o => (
                      <div key={o.order_id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.01)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '14px', fontFamily: 'var(--font-title)', fontWeight: '700', color: 'var(--primary)' }}>{o.order_id}</span>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: statusColor(o.status) }}>{o.status}</span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>{o.order_date}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: '1.5' }}>
                          {o.items.map(i => `${i.model_number} (${i.material}/${i.color} ${i.size}) x${i.quantity}`).join(', ')}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', fontWeight: '600' }}>
                          <span>금액: <strong style={{ color: '#ef4444' }}>{o.total_amount.toLocaleString()}원</strong></span>
                          <span>순금: <strong style={{ color: 'var(--primary)' }}>{o.total_gold_weight_24k_g}g</strong></span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 금 입고 정산 모달 */}
      {showPayModal && selectedCust && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '400px', background: 'var(--bg-surface-solid)', border: '1px solid var(--primary)', boxShadow: '0 0 24px rgba(212,175,55,0.15)' }}>
            <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <ShieldCheck size={17} style={{ color: 'var(--primary)' }} />
              실물 순금 입고 정산
            </h3>
            <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>대상 거래처</label>
                <div style={{ fontSize: '17px', fontWeight: '700' }}>{selectedCust.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>현재 미수: {selectedCust.gold_balance_24k_g}g</div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>정산할 실물 금 중량 (g)</label>
                <input type="number" step="0.01" required placeholder="0.00" value={weight} onChange={e => setWeight(e.target.value)} className="input-field" style={{ width: '100%' }} autoFocus />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px' }}>상세 비고</label>
                <input type="text" placeholder="예: 종로공장 실물 골드바 정산" value={note} onChange={e => setNote(e.target.value)} className="input-field" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                <button type="button" onClick={() => setShowPayModal(false)} className="btn-primary" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border-color)', boxShadow: 'none' }}>취소</button>
                <button type="submit" className="btn-primary">장부 정산 승인</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
