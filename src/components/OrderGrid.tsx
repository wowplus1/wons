// src/components/OrderGrid.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useErpStore } from '../store/useErpStore';
import { Plus, Trash2, CheckCircle2, Search, X, ChevronDown } from 'lucide-react';

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
    cancelEditOrder
  } = useErpStore();

  const containerRef = useRef<HTMLDivElement>(null);
  
  // Stone Search Modal states
  const [stoneModalTarget, setStoneModalTarget] = useState<{ rowIndex: number; type: 'main' | 'sub' } | null>(null);
  const [stoneSearchText, setStoneSearchText] = useState('');

  // Image Loading Error States
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

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
      grade: 3, // 기본은 '일반'(3등급)으로 설정
      material: '14K',
      color: 'YG',
      manufacturer: 'JP',
      qty_main: 0,
      qty_sub: 0,
      stone_weight_ea: 0,
      labor_base: 0,
      labor_extra: 0,
      labor_main: 0,
      labor_sub: 0,
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

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customer = customers.find(c => c.customer_id === e.target.value) || null;
    selectCustomer(customer);
    
    if (customer) {
      // Create first empty row with customer's default grade
      addOrderItem({ 
        item_id: 1, 
        quantity: 1, 
        grade: 3, // 기본은 '일반'(3등급)으로 설정
        material: '14K',
        color: 'YG',
        manufacturer: 'JP',
        qty_main: 0,
        qty_sub: 0,
        stone_weight_ea: 0,
        labor_base: 0,
        labor_extra: 0,
        labor_main: 0,
        labor_sub: 0,
        division: '판매',
        note: ''
      });
    }
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
        stone_weight_ea: stoneDetail.weight_carat
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
    <div className="glass-panel animate-fade-in" ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12px' }}>
      
      {/* Top Header & Customer Selection */}
      <div className="order-grid-header">
        <div className="order-header-select-group">
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}>거래처 선택 (필수):</label>
          <select
            value={selectedCustomerForOrder?.customer_id || ''}
            onChange={handleCustomerChange}
            disabled={!!editingOrderId}
            className="input-field"
            style={{ padding: '6px 12px', fontSize: '12px', cursor: editingOrderId ? 'not-allowed' : 'default', opacity: editingOrderId ? 0.6 : 1 }}
          >
            <option value="">-- 거래처를 먼저 선택해 주세요 --</option>
            {customers.map(c => (
              <option key={c.customer_id} value={c.customer_id}>
                {c.name} ({c.code}) - {c.grade}등급 ({c.trade_type === 'weight' ? '중량' : '시세'})
              </option>
            ))}
          </select>
        </div>

        <h2 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="gradient-text" style={{ fontFamily: 'var(--font-title)', fontWeight: '600' }}>
            {editingOrderId ? `Order Editor [수정 중: ${editingOrderId}]` : 'Quick Order Sheet'}
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
          background: 'rgba(255, 255, 255, 0.01)',
          textAlign: 'center',
          gap: '8px',
          margin: '20px 0'
        }}>
          <Search size={32} style={{ color: 'var(--primary)', opacity: 0.8 }} />
          <h3 style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '600' }}>거래처 미선택</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            주문서 작성을 시작하려면 상단 우측의 <strong style={{ color: 'var(--primary)' }}>'거래처 선택 (필수)'</strong> 드롭다운에서 거래처를 선택해 주세요.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          {/* Card Item List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
            {currentOrderItems.map((item, index) => {
              const matchedCatalog = catalog.find(c => c.model_number === item.model_number);
              
              return (
                <div 
                  key={item.item_id} 
                  className="glass-panel" 
                  style={{
                    border: '1.5px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '16px',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.01) 0%, rgba(255, 255, 255, 0.03) 100%)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    position: 'relative',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* Card Title & Delete Button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
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
                        fontSize: '11px', 
                        fontWeight: 'bold' 
                      }}>
                        {index + 1}
                      </span>
                      <strong style={{ fontSize: '13px', color: 'var(--text-muted)' }}>품목 정보 입력</strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeOrderItem(index)}
                      className="badge badge-danger"
                      style={{ border: 'none', background: 'var(--danger-bg)', cursor: 'pointer', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                      title="항목 제거"
                    >
                      <Trash2 size={12} /> 삭제
                    </button>
                  </div>

                  {/* 1단계: 기본 정보 (구분, 주문모델, 제조사, 수량, 색상, 재질) */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                      [1단계] 기본 사양 정보
                    </div>
                    <div className="order-form-step-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(24, minmax(0, 1fr))', gap: '12px', alignItems: 'end' }}>
                      {/* 구분 */}
                      <div style={{ gridColumn: 'span 3' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>구분</label>
                        <select
                          value={item.division || '판매'}
                          onChange={(e) => updateOrderItem(index, { division: e.target.value as '판매' | '결제' | '반품' | 'DC' })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'division')}
                          className="input-field"
                          style={{ 
                            width: '100%',
                            height: '32px',
                            padding: '4px 8px',
                            fontSize: '12px',
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
                      <div style={{ gridColumn: 'span 7' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>★ 주문모델</label>
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
                          opacity: item.division === '결제' ? 0.6 : 1
                        }}>
                          <input
                            type="text"
                            placeholder="모델 검색"
                            value={item.model_number || ''}
                            data-field="model_number"
                            disabled={item.division === '결제'}
                            onChange={(e) => updateOrderItem(index, { model_number: e.target.value.toUpperCase() })}
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
                              fontSize: '12px',
                              cursor: item.division === '결제' ? 'not-allowed' : 'text'
                            }}
                            required={item.division !== '결제' && item.division !== 'DC'}
                          />
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
                          {matchedCatalog && matchedCatalog.images && matchedCatalog.images[0] && !imageErrors[matchedCatalog.model_number] && (
                            <img 
                              src={matchedCatalog.images[0]} 
                              alt="thumbnail" 
                              style={{ width: '22px', height: '22px', borderRadius: '2px', objectFit: 'cover' }} 
                              onError={() => setImageErrors(prev => ({ ...prev, [matchedCatalog.model_number]: true }))}
                            />
                          )}
                        </div>
                      </div>

                      {/* ★ 제조사 */}
                      <div style={{ gridColumn: 'span 6' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>★ 제조사</label>
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
                            fontSize: '12px',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'text',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                          required={item.division !== '결제' && item.division !== 'DC' && item.model_number !== '디자인출력'}
                        />
                      </div>

                      {/* 수량 */}
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>수량</label>
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
                            fontSize: '12px', 
                            textAlign: 'center',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'text',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                          required
                        />
                      </div>

                      {/* 색상 */}
                      <div style={{ gridColumn: 'span 3' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>색상</label>
                        <select
                          value={item.color || 'YG'}
                          disabled={item.division === '결제' || item.model_number === '디자인출력'}
                          onChange={(e) => updateOrderItem(index, { color: e.target.value })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'color')}
                          className="input-field"
                          style={{ 
                            width: '100%', 
                            height: '32px', 
                            padding: '4px 8px', 
                            fontSize: '12px',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'default',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                        >
                          <option value="YG">YG</option>
                          <option value="WG">WG</option>
                          <option value="RG">RG</option>
                        </select>
                      </div>

                      {/* 재질 */}
                      <div style={{ gridColumn: 'span 3' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>재질</label>
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
                            fontSize: '12px',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'default',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                        >
                          <option value="14K">14K</option>
                          <option value="18K">18K</option>
                          <option value="24K">순금</option>
                          <option value="Silver">은</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 2단계: 스톤 및 공임 정보 (자재 정보 1줄, 공임단가 정보 1줄로 분할하여 찌그러짐 원천 차단) */}
                  <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                      [2단계] 자재 및 세공 공임 정보
                    </div>
                    
                    {/* 2-1단계: 자재 정보 (스톤종류, 알수, 알중) */}
                    <div className="order-form-step-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(24, minmax(0, 1fr))', gap: '12px', alignItems: 'end' }}>
                      {/* 스톤종류 중심 */}
                      <div style={{ gridColumn: 'span 10' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>스톤종류 (중심)</label>
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
                              flex: 1, 
                              border: 'none', 
                              background: 'transparent', 
                              color: 'var(--text-main)', 
                              fontSize: '12px', 
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

                      {/* 스톤종류 보조 */}
                      <div style={{ gridColumn: 'span 6' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>스톤종류 (보조)</label>
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
                              flex: 1, 
                              border: 'none', 
                              background: 'transparent', 
                              color: 'var(--text-main)', 
                              fontSize: '12px', 
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

                      {/* 알수 보 */}
                      <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>알수 (보조)</label>
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
                            fontSize: '12px', 
                            textAlign: 'center',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'text',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                        />
                      </div>

                      {/* 알수 메 */}
                      <div style={{ gridColumn: 'span 3' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>알수 (메인)</label>
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
                            fontSize: '12px', 
                            textAlign: 'center',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'text',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                        />
                      </div>

                      {/* 알중/EA */}
                      <div style={{ gridColumn: 'span 3' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>알중 / EA</label>
                        <input
                          type="number"
                          step="0.001"
                          value={item.stone_weight_ea === 0 ? '' : item.stone_weight_ea}
                          disabled={item.division === '결제' || item.model_number === '디자인출력'}
                          onChange={(e) => updateOrderItem(index, { stone_weight_ea: parseFloat(e.target.value) || 0 })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'stone_weight_ea')}
                          className="input-field"
                          style={{ 
                            width: '100%', 
                            height: '32px', 
                            padding: '4px 8px', 
                            fontSize: '12px', 
                            textAlign: 'right',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'text',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                        />
                      </div>
                    </div>

                    {/* 2-2단계: 공임 정보 (기본, 추가, 중심, 보조, 급) */}
                    <div className="order-form-step-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(24, minmax(0, 1fr))', gap: '12px', alignItems: 'end' }}>
                      {/* 공임단가 기본 */}
                      <div style={{ gridColumn: 'span 5' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>
                          {item.model_number === '디자인출력' ? '디자인 비용' : item.division === '결제' ? '공임비(결제금액)' : '기본 공임'}
                        </label>
                        <input
                          type="number"
                          value={item.labor_base === 0 ? '' : item.labor_base}
                          onChange={(e) => updateOrderItem(index, { labor_base: parseInt(e.target.value) || 0 })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'labor_base')}
                          className="input-field"
                          style={{ width: '100%', height: '32px', padding: '4px 8px', fontSize: '12px', textAlign: 'right' }}
                        />
                      </div>

                      {/* 공임단가 추가 */}
                      <div style={{ gridColumn: 'span 5' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>추가 공임</label>
                        <input
                          type="number"
                          value={item.labor_extra === 0 ? '' : item.labor_extra}
                          disabled={item.division === '결제' || item.model_number === '디자인출력'}
                          onChange={(e) => updateOrderItem(index, { labor_extra: parseInt(e.target.value) || 0 })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'labor_extra')}
                          className="input-field"
                          style={{ 
                            width: '100%', 
                            height: '32px', 
                            padding: '4px 8px', 
                            fontSize: '12px', 
                            textAlign: 'right',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'text',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                        />
                      </div>

                      {/* 공임단가 중심 */}
                      <div style={{ gridColumn: 'span 6' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>공임 (중심)</label>
                        <input
                          type="number"
                          value={item.labor_main === 0 ? '' : item.labor_main}
                          disabled={item.division === '결제' || item.model_number === '디자인출력'}
                          onChange={(e) => updateOrderItem(index, { labor_main: parseInt(e.target.value) || 0 })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'labor_main')}
                          className="input-field"
                          style={{ 
                            width: '100%', 
                            height: '32px', 
                            padding: '4px 8px', 
                            fontSize: '12px', 
                            textAlign: 'right',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'text',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                        />
                      </div>

                      {/* 공임단가 보조 */}
                      <div style={{ gridColumn: 'span 5' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>공임 (보조)</label>
                        <input
                          type="number"
                          value={item.labor_sub === 0 ? '' : item.labor_sub}
                          disabled={item.division === '결제'}
                          onChange={(e) => updateOrderItem(index, { labor_sub: parseInt(e.target.value) || 0 })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'labor_sub')}
                          className="input-field"
                          style={{ 
                            width: '100%', 
                            height: '32px', 
                            padding: '4px 8px', 
                            fontSize: '12px', 
                            textAlign: 'right',
                            cursor: item.division === '결제' ? 'not-allowed' : 'text',
                            opacity: item.division === '결제' ? 0.6 : 1
                          }}
                        />
                      </div>

                      {/* 공임단가 급 */}
                      <div style={{ gridColumn: 'span 3' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>공임 급</label>
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
                            fontSize: '12px', 
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
                  </div>

                  {/* 3단계: 규격 및 메모 (사이즈, 주문 기타설명, 출고일, 계산금액) */}
                  <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--primary)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                      [3단계] 규격 및 상세 특이사항
                    </div>
                    <div className="order-form-step-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(24, minmax(0, 1fr))', gap: '12px', alignItems: 'end' }}>
                      {/* 사이즈 */}
                      <div style={{ gridColumn: 'span 4' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>사이즈</label>
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
                            fontSize: '12px',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'text',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                        />
                      </div>

                      {/* 주문 기타설명 */}
                      <div style={{ gridColumn: 'span 12' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>주문 기타설명 (상세 비고)</label>
                        <input
                          type="text"
                          placeholder="특이사항이나 전달 문구를 입력하세요."
                          value={item.note || ''}
                          onChange={(e) => updateOrderItem(index, { note: e.target.value })}
                          onKeyDown={(e) => handleKeyDown(e, index, 'note')}
                          className="input-field"
                          style={{ width: '100%', height: '32px', padding: '4px 8px', fontSize: '12px' }}
                        />
                      </div>

                      {/* 출고일 */}
                      <div style={{ gridColumn: 'span 5' }}>
                        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', whiteSpace: 'nowrap' }}>출고 예정일</label>
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
                            fontSize: '12px',
                            cursor: (item.division === '결제' || item.model_number === '디자인출력') ? 'not-allowed' : 'default',
                            opacity: (item.division === '결제' || item.model_number === '디자인출력') ? 0.6 : 1
                          }}
                        />
                      </div>

                      {/* 계산금액 */}
                      <div style={{ gridColumn: 'span 3', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', whiteSpace: 'nowrap' }}>실시간 계산금액</span>
                        <div style={{ 
                          fontSize: '13px', 
                          fontWeight: '800', 
                          color: 'var(--primary)',
                          background: 'rgba(212, 175, 55, 0.08)',
                          border: '1px solid rgba(212, 175, 55, 0.2)',
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
                    </div>
                  </div>
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
              style={{ padding: '8px 16px', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-main)', border: '1px solid var(--border-color)', boxShadow: 'none', fontSize: '13px' }}
            >
              <Plus size={14} /> 품목 추가하기
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>총 주문금액 합계</div>
                <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--font-title)', color: 'var(--primary)' }}>
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
                      style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#fb7185', border: '1px solid rgba(239, 68, 68, 0.3)', boxShadow: 'none', fontSize: '13px', padding: '8px 18px', cursor: 'pointer' }}
                    >
                      수정 취소
                    </button>
                    <button type="submit" className="btn-primary" style={{ fontSize: '13px', padding: '8px 20px', background: 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)', color: 'var(--text-inverse)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      <CheckCircle2 size={14} style={{ marginRight: '4px' }} /> 수정 완료 (덮어쓰기)
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={clearOrderForm}
                      className="btn-primary"
                      style={{ background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', boxShadow: 'none', fontSize: '13px', padding: '8px 18px', cursor: 'pointer' }}
                    >
                      전체 초기화
                    </button>
                    <button type="submit" className="btn-primary" style={{ fontSize: '13px', padding: '8px 20px', cursor: 'pointer' }}>
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
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)' }}>
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
                style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
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
                        background: 'rgba(255, 255, 255, 0.01)'
                      }}
                      className="stone-select-item"
                    >
                      <div>
                        <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{s.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
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
                style={{ padding: '5px 14px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
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

