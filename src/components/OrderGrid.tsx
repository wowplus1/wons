// src/components/OrderGrid.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useErpStore } from '../store/useErpStore';
import { Plus, Trash2, CheckCircle2, Search, X, ChevronDown } from 'lucide-react';
import { toCommaString, fromCommaStringInt } from '../utils/numberFormat';


export const OrderGrid: React.FC = () => {
  const {
    customers,
    catalog,
    stones,
    selectedCustomerForOrder,
    currentOrderItems,
    selectCustomer,
    addOrderItem,
    updateOrderItem,
    removeOrderItem,
    submitOrder,
    clearOrderForm,
    editingOrderId,
    cancelEditOrder,
    setActiveTab
  } = useErpStore();

  const containerRef = useRef<HTMLDivElement>(null);
  
  // 거래처 검색어 및 드롭다운 열림 상태 추가
  const [customerSearchText, setCustomerSearchText] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  useEffect(() => {
    if (selectedCustomerForOrder) {
      setCustomerSearchText(`${selectedCustomerForOrder.name} (${selectedCustomerForOrder.code})`);
    } else {
      setCustomerSearchText('');
    }
  }, [selectedCustomerForOrder]);

  // 외부 클릭 시 거래처 드롭다운 닫기
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.order-header-select-group')) {
        setIsCustomerDropdownOpen(false);
        if (!selectedCustomerForOrder) {
          setCustomerSearchText('');
        } else {
          setCustomerSearchText(`${selectedCustomerForOrder.name} (${selectedCustomerForOrder.code})`);
        }
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [selectedCustomerForOrder]);

  const filteredCustomers = React.useMemo(() => {
    const q = (customerSearchText || '').trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.code.toLowerCase().includes(q)
    );
  }, [customers, customerSearchText]);

  const handleSelectCustomer = (customer: any) => {
    selectCustomer(customer);
    if (customer) {
      addOrderItem({ 
        item_id: 1, 
        quantity: 1, 
        grade: 3,
        material: '14K',
        color: 'G',
        manufacturer: '자체제작',
        qty_main: 0,
        qty_sub: 0,
        stone_weight_ea: 0,
        labor_base: 0,
        labor_extra: 0,
        labor_main: 0,
        labor_sub: 0,
        labor_stone_total: 0,
        division: '판매',
        note: ''
      });
    }
  };

  // 상세설정 토글 상태 관리 (아코디언)
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  
  // 모델 검색 자동완성 드롭다운을 활성화할 행 인덱스
  const [activeModelDropdownIndex, setActiveModelDropdownIndex] = useState<number | null>(null);

  // Stone Search Modal states
  const [stoneModalTarget, setStoneModalTarget] = useState<{ rowIndex: number; type: 'main' | 'sub' } | null>(null);
  const [stoneSearchText, setStoneSearchText] = useState('');



  const handleOpenCatalogPopup = (rowIndex: number) => {
    if (!selectedCustomerForOrder) return;
    const grade = selectedCustomerForOrder.grade;
    const w = 500;
    const h = 650;
    const left = window.screen.width / 2 - w / 2;
    const top = window.screen.height / 2 - h / 2;
    
    window.open(
      `./?popup=catalog_select&grade=${grade}&row=${rowIndex}`,
      `catalog_select_popup_${rowIndex}`,
      `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );
  };

  useEffect(() => {
    useErpStore.getState().fetchDb();
  }, []);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    rowIndex: number,
    _field?: string
  ) => {
    if (e.key === 'Enter') {
      if (rowIndex === currentOrderItems.length - 1) {
        e.preventDefault();
        handleAddRow();
      }
    }
  };

  const handleAddRow = () => {
    if (!selectedCustomerForOrder) {
      alert('거래처를 먼저 선택해 주세요.');
      return;
    }
    addOrderItem({ 
      item_id: currentOrderItems.length + 1, 
      quantity: 1,
      grade: 3, // 초기 공임급 일반(3) 고정
      material: '14K',
      color: 'G',
      manufacturer: '자체제작',
      qty_main: 0,
      qty_sub: 0,
      stone_weight_ea: 0,
      labor_base: 0,
      labor_extra: 0,
      labor_main: 0,
      labor_sub: 0,
      labor_stone_total: 0,
      division: '판매',
      note: ''
    });
    
    // Focus first input of next row
    setTimeout(() => {
      const inputs = containerRef.current?.querySelectorAll('[data-field="model_number"]');
      if (inputs && inputs.length > 0) {
        const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
        lastInput?.focus();
      }
    }, 50);
  };
 
  

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForOrder) {
      alert('거래처를 먼저 선택해 주세요.');
      return;
    }
    const isEdit = !!editingOrderId;
    const orderId = submitOrder();
    if (orderId) {
      if (isEdit) {
        alert(`주문서가 정상적으로 수정(업데이트)되었습니다. (주문번호: ${orderId})`);
      } else {
        alert(`주문서가 정상 접수되었습니다. (주문번호: ${orderId})`);
      }
      setActiveTab('orders');
    } else {
      alert('등록할 주문 항목이 없습니다. 모델번호와 수량을 정확히 입력해 주세요.');
    }
  };

  // Stone Selection Action
  const handleSelectStone = (stoneId: string) => {
    if (!stoneModalTarget || !selectedCustomerForOrder) return;
    const { rowIndex, type } = stoneModalTarget;
    const item = currentOrderItems[rowIndex];
    const stoneDetail = stones.find(s => s.stone_id === stoneId);
    
    if (!stoneDetail) return;
    const gradeKey = `grade_${item.grade || selectedCustomerForOrder.grade}`;
    const price = stoneDetail.grade_prices[gradeKey] || 0;

    if (type === 'main') {
      updateOrderItem(rowIndex, {
        stone_main_id: stoneDetail.stone_id,
        stone_main_name: stoneDetail.name,
        labor_main: price,
        stone_weight_ea: (stoneDetail.weight_carat || 0) + (stoneDetail.deduction_weight || 0)
      });
    } else {
      updateOrderItem(rowIndex, {
        stone_sub_id: stoneDetail.stone_id,
        stone_sub_name: stoneDetail.name,
        labor_sub: price
      });
    }
    setStoneModalTarget(null);
    setStoneSearchText('');
  };

  const totalOrderAmount = currentOrderItems.reduce((sum, item) => sum + (item.calculated_price || 0), 0);

  // Filter stones by search query
  const filteredStones = stones.filter(s => 
    s.name.toLowerCase().includes(stoneSearchText.toLowerCase()) ||
    s.shape.toLowerCase().includes(stoneSearchText.toLowerCase()) ||
    s.size.toLowerCase().includes(stoneSearchText.toLowerCase())
  );

  return (
    <div className="glass-panel animate-fade-in" ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15px' }}>
      
      {/* Top Header & Customer Selection */}
      <div className="order-grid-header">
        <div className="order-header-select-group" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)' }}>거래처 선택 (필수):</label>
          <div style={{ position: 'relative', width: '300px' }}>
            <input
              type="text"
              placeholder="거래처 이름 또는 코드 입력..."
              value={customerSearchText}
              onChange={(e) => {
                setCustomerSearchText(e.target.value);
                setIsCustomerDropdownOpen(true);
              }}
              onFocus={() => setIsCustomerDropdownOpen(true)}
              disabled={!!editingOrderId}
              className="input-field"
              style={{
                width: '100%',
                padding: '6px 12px',
                fontSize: '15px',
                cursor: editingOrderId ? 'not-allowed' : 'text',
                opacity: editingOrderId ? 0.6 : 1
              }}
            />
            {selectedCustomerForOrder && !editingOrderId && (
              <button
                type="button"
                onClick={() => {
                  selectCustomer(null);
                  setCustomerSearchText('');
                  setIsCustomerDropdownOpen(false);
                }}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ✕
              </button>
            )}

            {isCustomerDropdownOpen && !editingOrderId && (
              <div
                className="glass-panel"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  width: '100%',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  zIndex: 9999,
                  background: '#ffffff', // 백색 단색 배경으로 변경 (가독성 극대화)
                  border: '1px solid #2563eb', // 골드 테두리로 고급화
                  borderRadius: '6px',
                  marginTop: '4px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.15)'
                }}
              >
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(c => (
                    <div
                      key={c.customer_id}
                      onMouseDown={() => {
                        handleSelectCustomer(c);
                        setCustomerSearchText(`${c.name} (${c.code})`);
                        setIsCustomerDropdownOpen(false);
                      }}
                      style={{
                        padding: '10px 14px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background 0.2s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: '#1f2937' // 명확하고 진한 글자색
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.12)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div>
                        <strong style={{ color: '#111827' }}>{c.name}</strong> <span style={{ color: '#6b7280', fontSize: '12px' }}>({c.code})</span>
                      </div>
                      <span style={{ fontSize: '11px', background: 'rgba(37, 99, 235, 0.15)', padding: '3px 6px', borderRadius: '3px', color: '#2563eb', fontWeight: 'bold' }}>
                        {c.grade}등급 • {c.trade_type === 'weight' ? '중량' : '시세'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '16px', color: '#9ca3af', fontSize: '14px', textAlign: 'center' }}>
                    일치하는 거래처가 없습니다.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <h2 style={{ fontSize: '19px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="gradient-text" style={{ fontFamily: 'var(--font-title)', fontWeight: '600' }}>
            {editingOrderId ? `주문 작성 (수정 중: ${editingOrderId})` : '주문 작성'}
          </span> 
        </h2>

      </div>

      {/* Grid Sheet Area */}
      {!selectedCustomerForOrder ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          border: '1px dashed var(--border-color)',
          borderRadius: '8px',
          background: 'rgba(15, 23, 42, 0.01)',
          textAlign: 'center',
          gap: '8px',
          margin: '20px 0'
        }}>
          <Search size={32} style={{ color: 'var(--primary)', opacity: 0.8 }} />
          <h3 style={{ fontSize: '17px', color: 'var(--text-main)', fontWeight: '600' }}>거래처 미선택</h3>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
            주문서 작성을 시작하려면 상단 우측의 <strong style={{ color: 'var(--primary)' }}>'거래처 선택 (필수)'</strong> 드롭다운에서 거래처를 선택해 주세요.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          {/* Card Item List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            {currentOrderItems.map((item, index) => {

              return (
                <div 
                  key={item.item_id} 
                  className="glass-panel" 
                  style={{
                    border: '1.5px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '16px',
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.01) 0%, rgba(15, 23, 42, 0.03) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    position: 'relative',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* Card Title & Delete Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(15,23,42,0.08)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        width: '20px', 
                        height: '20px', 
                        borderRadius: '50%', 
                        background: 'var(--primary)', 
                        color: 'var(--text-inverse)', 
                        display: 'inline-flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        fontSize: '14px', 
                        fontWeight: 'bold' 
                      }}>
                        {index + 1}
                      </span>
                      <strong style={{ fontSize: '16px', color: 'var(--text-muted)' }}>품목 정보 입력</strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeOrderItem(index)}
                      className="badge badge-danger"
                      style={{ border: 'none', background: 'var(--danger-bg)', cursor: 'pointer', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}
                      title="항목 제거"
                    >
                      <Trash2 size={12} /> 삭제
                    </button>
                  </div>

                  {/* 1단계: 기본 정보 (가로 1줄 콤팩트 배치) */}
                  <div style={{ marginBottom: expandedItems[item.item_id || 0] ? '12px' : '0px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'end' }}>

                      {/* 구분 */}
                      <div style={{ width: '80px' }}>
                        <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>구분</label>
                        <select
                          value={item.division || '판매'}
                          onChange={(e) => updateOrderItem(index, { division: e.target.value as '판매' | '결제' | '반품' | 'DC' })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'division')}
                          className="input-field"
                          style={{ 
                            width: '100%',
                            height: '32px',
                            padding: '4px 8px',
                            fontSize: '15px',
                            fontWeight: 'bold', 
                            color: item.division === '결제' ? '#34d399' : item.division === '반품' ? '#fb7185' : item.division === 'DC' ? '#a78bfa' : '#38bdf8' 
                          }}
                        >
                          <option value="판매" style={{ color: '#38bdf8' }}>판매</option>
                          <option value="결제" style={{ color: '#34d399' }}>결제</option>
                          <option value="반품" style={{ color: '#fb7185' }}>반품</option>
                          <option value="DC" style={{ color: '#a78bfa' }}>DC</option>
                        </select>
                      </div>

                      {/* ★ 주문모델 */}
                      <div style={{ width: '180px', position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>★ 주문모델</label>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          background: item.division === '결제' ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.2)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '6px', 
                          padding: '0 8px', 
                          height: '32px', 
                          boxSizing: 'border-box',
                          opacity: item.division === '결제' ? 0.6 : 1,
                          position: 'relative'
                        }}>
                          <input
                            type="text"
                            placeholder="모델 검색"
                            value={item.model_number || ''}
                            data-field="model_number"
                            disabled={item.division === '결제' || (item.model_number !== '' && item.model_number !== undefined && catalog.some(c => c.model_number === item.model_number))}
                            onChange={(e) => {
                              updateOrderItem(index, { model_number: e.target.value.toUpperCase() });
                              setActiveModelDropdownIndex(index);
                            }}
                            onFocus={() => {
                              if (item.division !== '결제') {
                                setActiveModelDropdownIndex(index);
                              }
                            }}
                            onBlur={(e) => {
                              const val = e.target.value.toUpperCase().trim();
                              const isExist = catalog.some(c => c.model_number.toUpperCase().trim() === val);
                              if (isExist) {
                                updateOrderItem(index, { model_number: val }, true);
                              }
                              setTimeout(() => {
                                setActiveModelDropdownIndex(null);
                              }, 200);
                            }}
                            onKeyDown={(e) => handleKeyDown(e, index, 'model_number')}
                            className="excel-input"
                            style={{ 
                              flex: 1, 
                              border: 'none', 
                              background: 'transparent', 
                              height: '100%', 
                              color: 'var(--text-main)', 
                              fontWeight: 'bold', 
                              outline: 'none', 
                              fontSize: '15px',
                              cursor: item.division === '결제' ? 'not-allowed' : 'text',
                              paddingRight: (item.model_number && catalog.some(c => c.model_number === item.model_number)) ? '20px' : '0px'
                            }}
                            required={item.division !== '결제' && item.division !== 'DC'}
                          />
                          
                          {/* X 초기화 버튼 */}
                          {item.model_number && catalog.some(c => c.model_number === item.model_number) && item.division !== '결제' && (
                            <button
                              type="button"
                              onClick={() => {
                                updateOrderItem(index, { 
                                  model_number: '',
                                  labor_base: 0,
                                  labor_main: 0,
                                  labor_sub: 0,
                                  labor_stone_total: 0,
                                  stone_main_name: '',
                                  stone_sub_name: '',
                                  qty_main: 0,
                                  qty_sub: 0,
                                  stone_weight_ea: 0
                                });
                                // 상세 토글 닫기
                                setExpandedItems(prev => ({ ...prev, [item.item_id || 0]: false }));
                              }}
                              style={{
                                position: 'absolute',
                                right: '30px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--danger)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '4px',
                                zIndex: 10
                              }}
                              title="모델 선택 취소"
                            >
                              <X size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenCatalogPopup(index)}
                            disabled={item.division === '결제'}
                            style={{ 
                              background: 'transparent', 
                              border: 'none', 
                              color: 'var(--primary)', 
                              cursor: item.division === '결제' ? 'not-allowed' : 'pointer', 
                              padding: '2px', 
                              display: 'flex', 
                              alignItems: 'center',
                              opacity: item.division === '결제' ? 0.4 : 1
                            }}
                            title="카달로그 검색"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>

                        {/* 자동완성 드롭다운 */}
                        {activeModelDropdownIndex === index && item.model_number && !catalog.some(c => c.model_number === item.model_number) && (
                          <div 
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              background: 'var(--bg-surface-solid)',
                              border: '1px solid #2563eb',
                              borderRadius: '6px',
                              maxHeight: '200px',
                              overflowY: 'auto',
                              zIndex: 9999,
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.15)',
                              padding: '4px 0',
                              marginTop: '4px'
                            }}
                          >
                            {(() => {
                              const filterQuery = (item.model_number || '').toUpperCase().trim();
                              const filtered = catalog.filter(c => 
                                c.model_number.toUpperCase().trim().includes(filterQuery)
                              );
                              if (filtered.length === 0) {
                                return (
                                  <div style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '14px' }}>
                                    검색된 모델 없음
                                  </div>
                                );
                              }
                              return filtered.map(c => (
                                <div 
                                  key={c.model_number}
                                  onClick={() => {
                                    updateOrderItem(index, { model_number: c.model_number }, true);
                                    setActiveModelDropdownIndex(null);
                                  }}
                                  style={{ 
                                    padding: '8px 12px', 
                                    cursor: 'pointer', 
                                    fontSize: '14px',
                                    color: item.model_number === c.model_number ? 'var(--primary)' : 'var(--text-main)',
                                    background: item.model_number === c.model_number ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                                    transition: 'background 0.2s',
                                    whiteSpace: 'nowrap'
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37, 99, 235, 0.18)'; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = item.model_number === c.model_number ? 'rgba(37, 99, 235, 0.1)' : 'transparent'; }}
                                >
                                  {c.model_number}
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                      </div>

                      {/* 제조사 */}
                      <div style={{ width: '90px' }}>
                        <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>제조사</label>
                        <input
                          type="text"
                          value={item.manufacturer || ''}
                          disabled={item.division === '결제' || item.model_number === '디자인출력'}
                          onChange={(e) => updateOrderItem(index, { manufacturer: e.target.value })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'manufacturer')}
                          className="input-field"
                          style={{ 
                            width: '100%', 
                            height: '32px', 
                            padding: '4px 8px', 
                            fontSize: '15px',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'text',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                          required={item.division !== '결제' && item.division !== 'DC' && item.model_number !== '디자인출력'}
                        />
                      </div>

                      {/* 수량 */}
                      <div style={{ width: '60px' }}>
                        <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>수량</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity || 1}
                          disabled={item.division === '결제' || item.model_number === '디자인출력'}
                          onChange={(e) => updateOrderItem(index, { quantity: parseInt(e.target.value) || 1 })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'quantity')}
                          className="input-field"
                          style={{ 
                            width: '100%', 
                            height: '32px', 
                            padding: '4px 8px', 
                            fontSize: '15px', 
                            textAlign: 'center',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'text',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                          required
                        />
                      </div>

                      {/* 사이즈 */}
                      <div style={{ width: '90px' }}>
                        <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>사이즈</label>
                        <input
                          type="text"
                          placeholder={(item.division === '결제' || item.model_number === '디자인출력') ? '입력 안 함' : '예: 12호'}
                          value={item.size || ''}
                          disabled={item.division === '결제' || item.model_number === '디자인출력'}
                          onChange={(e) => updateOrderItem(index, { size: e.target.value })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'size')}
                          className="input-field"
                          style={{ 
                            width: '100%', 
                            height: '32px', 
                            padding: '4px 8px', 
                            fontSize: '15px',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'text',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                        />
                      </div>

                      {/* 색상 */}
                      <div style={{ width: '80px' }}>
                        <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>색상</label>
                        <select
                          value={item.color || 'G'}
                          disabled={item.division === '결제' || item.model_number === '디자인출력'}
                          onChange={(e) => updateOrderItem(index, { color: e.target.value })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'color')}
                          className="input-field"
                          style={{ 
                            width: '100%', 
                            height: '32px', 
                            padding: '4px 8px', 
                            fontSize: '15px',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'default',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                        >
                          {(() => {
                            const CATALOG_COLORS = [
                              'G', 'G/B', 'G/P', 'G/R/W', 'G/W', 'G/WP',
                              'P', 'P/G', 'P/W', 'P/엔틱',
                              'W', 'W/B', 'W/G', 'W/GP', 'W/P',
                              '삼색', '엔틱'
                            ];

                            if (item.model_number === '디자인출력' || item.model_number === '결제') {
                              return CATALOG_COLORS.map(color => (
                                <option key={color} value={color}>{color}</option>
                              ));
                            }
                            const catalogItem = catalog.find(c => c.model_number.toUpperCase().trim() === (item.model_number || '').toUpperCase().trim());
                            if (!catalogItem) {
                              return CATALOG_COLORS.map(color => (
                                <option key={color} value={color}>{color}</option>
                              ));
                            }
                            const mat = item.material || '14K';
                            let colors: string[] = [];
                            if (catalogItem.labor_fees_v2 && catalogItem.labor_fees_v2[mat]) {
                              colors = catalogItem.labor_fees_v2[mat]
                                .map(fee => fee.color)
                                .filter((c): c is string => !!c && c.trim() !== '');
                            }
                            if (catalogItem.labor_fees_v2) {
                              Object.keys(catalogItem.labor_fees_v2).forEach(m => {
                                const fees = catalogItem.labor_fees_v2?.[m];
                                if (fees) {
                                  fees.forEach(fee => {
                                    if (fee.color && fee.color.trim() !== '') {
                                      colors.push(fee.color);
                                    }
                                  });
                                }
                              });
                            }
                            // 카탈로그 전체 색상 리스트를 하단에 병합하여 언제든지 수정 가능하게 함
                            colors.push(...CATALOG_COLORS);
                            const uniqueColors = Array.from(new Set(colors));
                            
                            return uniqueColors.map(color => (
                              <option key={color} value={color}>{color}</option>
                            ));
                          })()}
                        </select>
                      </div>

                      {/* 재질 */}
                      <div style={{ width: '80px' }}>
                        <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>재질</label>
                        <select
                          value={item.material || '14K'}
                          disabled={item.division === '결제' || item.model_number === '디자인출력'}
                          onChange={(e) => updateOrderItem(index, { material: e.target.value })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'material')}
                          className="input-field"
                          style={{ 
                            width: '100%', 
                            height: '32px', 
                            padding: '4px 8px', 
                            fontSize: '15px',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'default',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                        >
                          <option value="14K">14K</option>
                          <option value="18K">18K</option>
                          <option value="24K">24K</option>
                          <option value="다이아">다이아</option>
                          <option value="은">은</option>
                        </select>
                      </div>

                      {/* 중량 (g) */}
                      <div style={{ width: '90px' }}>
                        <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>중량 (g)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.gold_weight === 0 ? '' : item.gold_weight}
                          disabled={item.division === '결제' || item.model_number === '디자인출력'}
                          onChange={(e) => updateOrderItem(index, { gold_weight: parseFloat(e.target.value) || 0 })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'gold_weight')}
                          placeholder="0.00"
                          className="input-field"
                          style={{ 
                            width: '100%', 
                            height: '32px', 
                            padding: '4px 8px', 
                            fontSize: '15px', 
                            textAlign: 'right',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'text',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                        />
                      </div>

                      {/* 출고 예정일 */}
                      <div style={{ width: '130px' }}>
                        <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>출고 예정일</label>
                        <input
                          type="date"
                          value={item.release_date || ''}
                          disabled={item.division === '결제' || item.model_number === '디자인출력'}
                          onChange={(e) => updateOrderItem(index, { release_date: e.target.value })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'release_date')}
                          className="input-field"
                          style={{ 
                            width: '100%', 
                            height: '32px', 
                            padding: '4px 8px', 
                            fontSize: '15px',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'default',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                        />
                      </div>

                      {/* 주문 기타설명 */}
                      <div style={{ flex: 1, minWidth: '150px' }}>
                        <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>주문 기타설명</label>
                        <input
                          type="text"
                          value={item.note || ''}
                          onChange={(e) => updateOrderItem(index, { note: e.target.value })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'note')}
                          placeholder="기타 특이사항 입력"
                          className="input-field"
                          style={{ width: '100%', height: '32px', padding: '4px 8px', fontSize: '15px' }}
                        />
                      </div>

                      {/* 추가 공임 */}
                      <div style={{ width: '130px' }}>
                        <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>추가 공임</label>
                        <input
                          type="text"
                          value={toCommaString(item.labor_extra === 0 ? '' : item.labor_extra)}
                          disabled={item.division === '결제'}
                          onChange={(e) => updateOrderItem(index, { labor_extra: fromCommaStringInt(e.target.value) })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'labor_extra')}
                          className="input-field"
                          style={{ 
                            width: '100%', 
                            height: '32px', 
                            padding: '4px 8px', 
                            fontSize: '15px', 
                            textAlign: 'right',
                            cursor: (item.division === '결제') ? 'not-allowed' : 'text',
                            opacity: (item.division === '결제') ? 0.6 : 1
                          }}
                        />
                      </div>

                      {/* 실시간 계산금액 */}
                      <div style={{ width: '140px', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap' }}>실시간 계산금액</span>
                        <div style={{ 
                          fontSize: '16px', 
                          fontWeight: '800', 
                          color: 'var(--primary)',
                          background: 'rgba(37, 99, 235, 0.08)',
                          border: '1px solid rgba(37, 99, 235, 0.2)',
                          padding: '0 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          height: '32px',
                          width: '100%',
                          boxSizing: 'border-box',
                          whiteSpace: 'nowrap'
                        }}>
                          {(item.calculated_price || 0).toLocaleString()} 원
                        </div>
                      </div>

                      {/* 상세설정 열기/접기 */}
                      <div style={{ width: '110px' }}>
                        <button
                          type="button"
                          onClick={() => setExpandedItems(prev => ({ ...prev, [item.item_id || 0]: !prev[item.item_id || 0] }))}
                          className="btn-secondary"
                          style={{ 
                            width: '100%', 
                            height: '32px', 
                            fontSize: '14px', 
                            padding: '0 8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          {expandedItems[item.item_id || 0] ? '상세설정 접기' : '상세설정 열기'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 상세설정 아코디언 내부 (가로 1줄 콤팩트 배치) */}
                  {expandedItems[item.item_id || 0] && (
                    <div style={{ 
                      borderTop: '1px dashed rgba(15,23,42,0.08)', 
                      paddingTop: '12px',
                      display: 'flex',
                      flexDirection: 'row',
                      flexWrap: 'nowrap',
                      gap: '8px',
                      alignItems: 'end',
                      overflowX: 'auto',
                      paddingBottom: '4px'
                    }}>
                      {/* 스톤종류 중심 */}
                      <div style={{ width: '150px', flexShrink: 0 }}>
                        <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>스톤종류 (중심)</label>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          background: (item.division === '결제' || item.model_number === '디자인출력') ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.15)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '6px', 
                          padding: '0 8px', 
                          height: '32px', 
                          boxSizing: 'border-box',
                          opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                        }}>
                          <input
                            type="text"
                            value={item.stone_main_name || ''}
                            disabled
                            placeholder={(item.division === '결제' || item.model_number === '디자인출력') ? '선택 안 함' : '중심 스톤 선택'}
                            style={{ 
                              width: '100%',
                              border: 'none', 
                              background: 'transparent', 
                              color: 'var(--text-main)', 
                              fontSize: '15px', 
                              outline: 'none',
                              cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'default'
                            }}
                          />
                          <button 
                            type="button" 
                            disabled={item.division === '결제' || item.model_number === '디자인출력'}
                            onClick={() => setStoneModalTarget({ rowIndex: index, type: 'main' })}
                            style={{ 
                              background: 'transparent', 
                              border: 'none', 
                              color: 'var(--primary)', 
                              cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'pointer', 
                              padding: '2px', 
                              display: 'flex', 
                              alignItems: 'center',
                              opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.4 : 1
                            }}
                          >
                            <Search size={14} />
                          </button>
                        </div>
                      </div>

                      {/* 알수 (메인) */}
                      <div style={{ width: '60px', flexShrink: 0 }}>
                        <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>알수(메)</label>
                        <input
                          type="number"
                          value={item.qty_main === 0 ? '' : item.qty_main}
                          disabled={item.division === '결제' || item.model_number === '디자인출력'}
                          onChange={(e) => updateOrderItem(index, { qty_main: parseInt(e.target.value) || 0 })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'qty_main')}
                          className="input-field"
                          style={{ 
                            width: '100%', 
                            height: '32px', 
                            padding: '4px 8px', 
                            fontSize: '15px', 
                            textAlign: 'center',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'text',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                        />
                      </div>

                      {/* 스톤종류 보조 */}
                      <div style={{ width: '150px', flexShrink: 0 }}>
                        <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>스톤종류 (보조)</label>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          background: (item.division === '결제' || item.model_number === '디자인출력') ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.15)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '6px', 
                          padding: '0 8px', 
                          height: '32px', 
                          boxSizing: 'border-box',
                          opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                        }}>
                          <input
                            type="text"
                            value={item.stone_sub_name || ''}
                            disabled
                            placeholder={(item.division === '결제' || item.model_number === '디자인출력') ? '선택 안 함' : '보조 스톤 선택'}
                            style={{ 
                              width: '100%',
                              border: 'none', 
                              background: 'transparent', 
                              color: 'var(--text-main)', 
                              fontSize: '15px', 
                              outline: 'none',
                              cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'default'
                            }}
                          />
                          <button 
                            type="button" 
                            disabled={item.division === '결제' || item.model_number === '디자인출력'}
                            onClick={() => setStoneModalTarget({ rowIndex: index, type: 'sub' })}
                            style={{ 
                              background: 'transparent', 
                              border: 'none', 
                              color: 'var(--primary)', 
                              cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'pointer', 
                              padding: '2px', 
                              display: 'flex', 
                              alignItems: 'center',
                              opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.4 : 1
                            }}
                          >
                            <Search size={14} />
                          </button>
                        </div>
                      </div>

                      {/* 알수 (보조) */}
                      <div style={{ width: '60px', flexShrink: 0 }}>
                        <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>알수(보)</label>
                        <input
                          type="number"
                          value={item.qty_sub === 0 ? '' : item.qty_sub}
                          disabled={item.division === '결제' || item.model_number === '디자인출력'}
                          onChange={(e) => updateOrderItem(index, { qty_sub: parseInt(e.target.value) || 0 })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'qty_sub')}
                          className="input-field"
                          style={{ 
                            width: '100%', 
                            height: '32px', 
                            padding: '4px 8px', 
                            fontSize: '15px', 
                            textAlign: 'center',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'text',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                        />
                      </div>

                      {/* 알당 중량 */}
                      <div style={{ width: '90px', flexShrink: 0 }}>
                        <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>알중 / EA</label>
                        <input
                          type="number"
                          step="0.001"
                          value={item.stone_weight_ea === 0 ? '' : item.stone_weight_ea}
                          disabled={item.division === '결제' || item.model_number === '디자인출력'}
                          onChange={(e) => updateOrderItem(index, { stone_weight_ea: parseFloat(e.target.value) || 0 })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'stone_weight_ea')}
                          placeholder="0.000"
                          className="input-field"
                          style={{ 
                            width: '100%', 
                            height: '32px', 
                            padding: '4px 8px', 
                            fontSize: '15px', 
                            textAlign: 'right',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'text',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                        />
                      </div>

                      {/* 기본 공임 */}
                      <div style={{ width: '100px', flexShrink: 0 }}>
                        <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                          {item.model_number === '디자인출력' ? '디자인 비용' : item.division === '결제' ? '공임비(결제)' : '기본 공임'}
                        </label>
                        <input
                          type="text"
                          value={toCommaString(item.labor_base === 0 ? '' : item.labor_base)}
                          onChange={(e) => updateOrderItem(index, { labor_base: fromCommaStringInt(e.target.value) })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'labor_base')}
                          className="input-field"
                          style={{ width: '100%', height: '32px', padding: '4px 8px', fontSize: '15px', textAlign: 'right' }}
                        />
                      </div>

                      {/* 스톤 공임 합계 금액 */}
                      <div style={{ width: '100px', flexShrink: 0 }}>
                        <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>스톤합계 금액</label>
                        <input
                          type="text"
                          value={toCommaString(item.labor_stone_total === 0 || item.labor_stone_total === undefined ? '' : item.labor_stone_total)}
                          disabled={item.division === '결제'}
                          onChange={(e) => updateOrderItem(index, { labor_stone_total: fromCommaStringInt(e.target.value) })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'labor_stone_total')}
                          placeholder={(() => {
                            const calculated = (item.labor_main || 0) * (item.qty_main || 0) + (item.labor_sub || 0) * (item.qty_sub || 0);
                            return toCommaString(calculated === 0 ? '0' : calculated);
                          })()}
                          className="input-field"
                          style={{ 
                            width: '100%', 
                            height: '32px', 
                            padding: '4px 8px', 
                            fontSize: '15px', 
                            textAlign: 'right',
                            cursor: item.division === '결제' ? 'not-allowed' : 'text',
                            opacity: item.division === '결제' ? 0.6 : 1
                          }}
                        />
                      </div>

                      {/* 공임단가 급 */}
                      <div style={{ width: '80px', flexShrink: 0 }}>
                        <label style={{ display: 'block', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>공임 급</label>
                        <select
                          value={item.grade || 3}
                          disabled={item.division === '결제' || item.model_number === '디자인출력'}
                          onChange={(e) => updateOrderItem(index, { grade: parseInt(e.target.value) || 3 })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'grade')}
                          className="input-field"
                          style={{ 
                            width: '100%', 
                            height: '32px', 
                            padding: '4px 8px', 
                            fontSize: '15px', 
                            textAlign: 'center',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'default',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                        >
                          <option value={3}>일반</option>
                          <option value={2}>급</option>
                          <option value={1}>급급</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Row actions */}
          <div className="order-form-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={handleAddRow}
              className="btn-primary"
              style={{ padding: '8px 16px', background: 'rgba(15, 23, 42, 0.05)', color: 'var(--text-main)', border: '1px solid var(--border-color)', boxShadow: 'none', fontSize: '16px' }}
            >
              <Plus size={14} /> 품목 추가하기
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '15px', color: 'var(--text-muted)' }}>총 주문금액 합계</div>
                <div style={{ fontSize: '27px', fontWeight: '700', fontFamily: 'var(--font-title)', color: 'var(--primary)' }}>
                  {totalOrderAmount.toLocaleString()} 원
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                {editingOrderId ? (
                  <>
                    <button
                      type="button"
                      onClick={cancelEditOrder}
                      className="btn-primary"
                      style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fb7185', border: '1px solid rgba(239, 68, 68, 0.3)', boxShadow: 'none', fontSize: '16px', padding: '8px 18px', cursor: 'pointer' }}
                    >
                      수정 취소
                    </button>
                    <button type="submit" className="btn-primary" style={{ fontSize: '16px', padding: '8px 20px', background: 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)', color: 'var(--text-inverse)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      <CheckCircle2 size={14} style={{ marginRight: '4px' }} /> 수정 완료 (덮어쓰기)
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('작성 중인 주문서 내용을 모두 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
                          clearOrderForm();
                        }
                      }}
                      className="btn-primary"
                      style={{ background: 'rgba(15, 23, 42, 0.03)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', boxShadow: 'none', fontSize: '16px', padding: '8px 18px', cursor: 'pointer' }}
                    >
                      전체 초기화
                    </button>
                    <button type="submit" className="btn-primary" style={{ fontSize: '16px', padding: '8px 20px', cursor: 'pointer' }}>
                      <CheckCircle2 size={14} /> 주문서 접수 (스냅샷 저장)
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </form>
      )}



      {/* Stone Selector Modal */}
      {stoneModalTarget && (
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
            width: '440px',
            maxHeight: 'min(450px, 85vh)',
            background: 'var(--bg-surface-solid)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'var(--primary)' }}>
                스톤 마스터 검색 ({stoneModalTarget.type === 'main' ? '중심스톤' : '보조스톤'})
              </h3>
              <button 
                type="button" 
                onClick={() => { setStoneModalTarget(null); setStoneSearchText(''); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="스톤명, 모양, 사이즈 검색..."
                value={stoneSearchText}
                onChange={(e) => setStoneSearchText(e.target.value)}
                className="input-field"
                style={{ flex: 1, padding: '6px 10px', fontSize: '15px' }}
                autoFocus
              />
            </div>

            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px', maxHeight: '220px' }}>
              {filteredStones.length > 0 ? (
                filteredStones.map(s => {
                  const targetGrade = selectedCustomerForOrder?.grade || 1;
                  const price = s.grade_prices[`grade_${targetGrade}`] || 0;
                  return (
                    <div 
                      key={s.stone_id} 
                      onClick={() => handleSelectStone(s.stone_id)}
                      style={{
                        padding: '8px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'background 0.2s',
                        background: 'rgba(15, 23, 42, 0.01)'
                      }}
                      className="stone-select-item"
                    >
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{s.name}</div>
                        <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {s.shape} | {s.size} | {s.weight_carat}ct
                        </div>
                      </div>
                      <div style={{ fontWeight: '700', color: 'var(--primary)' }}>
                        {price.toLocaleString()} 원
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                  검색 조건에 맞는 스톤이 마스터에 존재하지 않습니다.
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
              <button 
                type="button" 
                onClick={() => { setStoneModalTarget(null); setStoneSearchText(''); }} 
                className="btn-primary" 
                style={{ padding: '5px 14px', background: 'rgba(15,23,42,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

