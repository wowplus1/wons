import React, { useState, useEffect } from 'react';
import { useErpStore } from '../store/useErpStore';
import type { Customer } from '../firebase/mockDb';
import { UserPlus, Search, Edit2, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';


export const CustomerManager: React.FC = () => {
  const { customers, saveCustomer, deleteCustomer } = useErpStore();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');

  // Form state
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [grade, setGrade] = useState<number>(1);
  const [lossRate, setLossRate] = useState<number>(10); // 기본 해리 10%
  const [tradeType, setTradeType] = useState<'weight' | 'price'>('weight'); // 기본 중량 거래
  const [businessNumber, setBusinessNumber] = useState('');
  const [goldBalance, setGoldBalance] = useState<number>(0);
  const [receivableAmount, setReceivableAmount] = useState<number>(0);

  // Auto-generate customer code when entering name (if not in edit mode)
  useEffect(() => {
    if (!isEditMode && name && !code) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      setCode(`C-${randomNum}`);
    }
  }, [name, isEditMode, code]);

  // Load customer data to form for editing
  const handleSelectCustomer = (cust: Customer) => {
    setIsEditMode(true);
    setSelectedCustomerId(cust.customer_id);
    setCode(cust.code);
    setName(cust.name);
    setOwnerName(cust.owner_name || '');
    setPhone(cust.phone || '');
    setGrade(cust.grade);
    setLossRate(cust.loss_rate !== undefined ? cust.loss_rate : 10);
    setTradeType(cust.trade_type || 'weight');
    setBusinessNumber(cust.business_number || '');
    setGoldBalance(cust.gold_balance_24k_g || 0);
    setReceivableAmount(cust.receivable_amount || 0);
    setIsFormOpen(true); // 상세 수정 클릭 시 자동으로 폼을 켬
  };

  // Reset Form
  const handleResetForm = () => {
    setIsEditMode(false);
    setSelectedCustomerId(null);
    setCode('');
    setName('');
    setOwnerName('');
    setPhone('');
    setGrade(1);
    setLossRate(10);
    setTradeType('weight');
    setBusinessNumber('');
    setGoldBalance(0);
    setReceivableAmount(0);
    setIsFormOpen(false); // 리셋 시 폼 닫기 (신규 등록 전환)
  };

  // Submit Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('거래처명을 입력해주세요.');
      return;
    }
    if (!code.trim()) {
      alert('거래처코드를 입력해주세요.');
      return;
    }

    const customerData: Customer = {
      customer_id: isEditMode && selectedCustomerId ? selectedCustomerId : `cust_${Date.now()}`,
      name: name.trim(),
      code: code.trim(),
      grade,
      owner_name: ownerName.trim(),
      phone: phone.trim(),
      loss_rate: Number(lossRate),
      trade_type: tradeType,
      business_number: businessNumber.trim(),
      gold_balance_24k_g: Number(goldBalance),
      receivable_amount: Number(receivableAmount),
      created_at: isEditMode && selectedCustomerId 
        ? (customers.find(c => c.customer_id === selectedCustomerId)?.created_at || new Date().toISOString()) 
        : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isEditMode) {
      const confirmUpdate = window.confirm('거래처 정보를 수정하시겠습니까?');
      if (!confirmUpdate) {
        return;
      }
    }

    saveCustomer(customerData);
    alert(isEditMode ? '거래처 정보가 수정되었습니다.' : '신규 거래처가 등록되었습니다.');
    handleResetForm();
  };

  // Delete Customer
  const handleDelete = (customerId: string, customerName: string) => {
    if (window.confirm(`정말로 [${customerName}] 거래처를 삭제하시겠습니까?\n삭제 시 장부 및 시뮬레이션 복구가 불가능할 수 있습니다.`)) {
      deleteCustomer(customerId);
      alert('거래처가 삭제되었습니다.');
      if (selectedCustomerId === customerId) {
        handleResetForm();
      }
    }
  };

  // Filtered customer list
  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.owner_name && c.owner_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesGrade = filterGrade === 'all' ? true : c.grade.toString() === filterGrade;
    return matchesSearch && matchesGrade;
  });

  return (
    <>
      {isFormOpen && <div className="mobile-backdrop" onClick={() => setIsFormOpen(false)} />}
      <div className="customer-manager-grid">
      
      {/* LEFT: Customer List Grid */}
      <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '72vh' }}>
        
        {/* Header and Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserPlus size={18} style={{ color: 'var(--primary)' }} />
            <h2 style={{ fontSize: '15px', fontWeight: '600', fontFamily: 'var(--font-title)' }}>거래처 마스터 관리</h2>
            <button
              className="btn-primary mobile-customer-add-btn"
              onClick={() => {
                handleResetForm();
                setIsFormOpen(true);
              }}
              style={{ padding: '4px 10px', fontSize: '11px', boxShadow: 'none' }}
            >
              <UserPlus size={12} />
              <span>신규 등록</span>
            </button>
          </div>
          
          {/* Search Bar & Filter */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="거래처명 / 코드 / 대표자 검색..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '30px', fontSize: '12px', width: '220px', height: '32px' }}
              />
            </div>
            
            <select
              value={filterGrade}
              onChange={e => setFilterGrade(e.target.value)}
              className="input-field"
              style={{ fontSize: '12px', height: '32px', padding: '0 8px' }}
            >
              <option value="all">모든 등급</option>
              <option value="1">1등급</option>
              <option value="2">2등급</option>
              <option value="3">3등급</option>
              <option value="4">4등급</option>
            </select>
          </div>
        </div>

        {/* Customer Table */}
        <div className="table-responsive" style={{ flex: 1 }}>
          <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid var(--border-color)', color: '#fff' }}>
                <th style={{ padding: '10px', width: '80px' }}>거래처코드</th>
                <th style={{ padding: '10px' }}>거래처명</th>
                <th style={{ padding: '10px', width: '90px' }}>대표자</th>
                <th style={{ padding: '10px', width: '60px', textAlign: 'center' }}>등급</th>
                <th style={{ padding: '10px', width: '80px', textAlign: 'center' }}>거래형태</th>
                <th style={{ padding: '10px', width: '60px', textAlign: 'center' }}>해리</th>
                <th style={{ padding: '10px', width: '100px', textAlign: 'right' }}>현금 미수</th>
                <th style={{ padding: '10px', width: '100px', textAlign: 'right' }}>순금 미수</th>
                <th style={{ padding: '10px', width: '90px', textAlign: 'center' }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    등록된 거래처가 없거나 검색 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust, idx) => (
                  <tr 
                    key={cust.customer_id}
                    style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      background: idx % 2 === 0 ? 'rgba(255,255,255,0.005)' : 'rgba(255,255,255,0.02)',
                      transition: 'background 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleSelectCustomer(cust)}
                  >
                    <td style={{ padding: '10px', fontWeight: '600', color: 'var(--primary)' }}>{cust.code}</td>
                    <td style={{ padding: '10px', fontWeight: '500', color: '#fff' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span>{cust.name}</span>
                        {cust.business_number && (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>사업자: {cust.business_number}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px' }}>{cust.owner_name || '-'}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span className="badge badge-warning" style={{ fontSize: '11px', padding: '2px 5px', background: 'rgba(212, 175, 55, 0.1)' }}>
                        {cust.grade}등
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span style={{ 
                        fontSize: '11px', 
                        padding: '2px 6px', 
                        borderRadius: '4px',
                        background: cust.trade_type === 'weight' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                        color: cust.trade_type === 'weight' ? '#3b82f6' : '#10b981'
                      }}>
                        {cust.trade_type === 'weight' ? '중량' : '시세'}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: '600' }}>
                      {cust.loss_rate !== undefined ? `${cust.loss_rate}%` : '10%'}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: cust.receivable_amount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {cust.receivable_amount.toLocaleString()}원
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: '600', color: cust.gold_balance_24k_g > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {cust.gold_balance_24k_g.toFixed(3)}g
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button
                          onClick={() => handleSelectCustomer(cust)}
                          className="btn-primary"
                          style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
                          title="상세 수정"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(cust.customer_id, cust.name)}
                          className="btn-primary"
                          style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', boxShadow: 'none' }}
                          title="거래처 삭제"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT: Register/Edit Form Panel */}
      <div className={`glass-panel animate-fade-in customer-form-panel ${isFormOpen ? 'mobile-show' : 'mobile-hide'}`}>
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }}>
            {isEditMode ? '거래처 정보 수정' : '신규 거래처 등록'}
          </h3>
          {isEditMode && (
            <button 
              onClick={handleResetForm} 
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
            >
              <RotateCcw size={12} /> 신규등록 전환
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px' }}>
          
          {/* Customer Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ color: 'var(--text-muted)' }}>거래처명 <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="예: 종로 골드라인"
              className="input-field" 
              style={{ width: '100%', fontSize: '12px' }}
              required 
            />
          </div>

          {/* Customer Code */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ color: 'var(--text-muted)' }}>거래처코드 <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input 
              type="text" 
              value={code} 
              onChange={e => setCode(e.target.value)} 
              placeholder="자동 생성 또는 직접 기입"
              className="input-field" 
              style={{ width: '100%', fontSize: '12px' }}
              required 
            />
          </div>

          {/* Business Registration Number */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ color: 'var(--text-muted)' }}>사업자등록번호 (사업자일 경우 입력)</label>
            <input 
              type="text" 
              value={businessNumber} 
              onChange={e => setBusinessNumber(e.target.value)} 
              placeholder="예: 123-45-67890"
              className="input-field" 
              style={{ width: '100%', fontSize: '12px' }}
            />
          </div>

          {/* Owner Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ color: 'var(--text-muted)' }}>대표자명</label>
            <input 
              type="text" 
              value={ownerName} 
              onChange={e => setOwnerName(e.target.value)} 
              placeholder="예: 김대표"
              className="input-field" 
              style={{ width: '100%', fontSize: '12px' }}
            />
          </div>

          {/* Phone Number */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ color: 'var(--text-muted)' }}>연락처 (전화번호)</label>
            <input 
              type="text" 
              value={phone} 
              onChange={e => setPhone(e.target.value)} 
              placeholder="예: 010-1234-5678"
              className="input-field" 
              style={{ width: '100%', fontSize: '12px' }}
            />
          </div>

          {/* Customer Grade (1 to 4) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ color: 'var(--text-muted)' }}>공급가 거래처등급</label>
            <select
              value={grade}
              onChange={e => setGrade(Number(e.target.value))}
              className="input-field"
              style={{ width: '100%', fontSize: '12px' }}
            >
              <option value={1}>1등급 (최우수 거래처)</option>
              <option value={2}>2등급 (일반 거래처)</option>
              <option value={3}>3등급 (신규/중간 거래처)</option>
              <option value={4}>4등급 (소매/단발성 거래처)</option>
            </select>
          </div>

          {/* Trade Type & Loss Rate */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: 'var(--text-muted)' }}>거래형태</label>
              <select
                value={tradeType}
                onChange={e => setTradeType(e.target.value as 'weight' | 'price')}
                className="input-field"
                style={{ width: '100%', fontSize: '12px' }}
              >
                <option value="weight">중량 거래</option>
                <option value="price">시세 거래</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: 'var(--text-muted)' }}>해리적용율 (%)</label>
              <input 
                type="number" 
                step="0.1"
                value={lossRate} 
                onChange={e => setLossRate(Math.max(0, parseFloat(e.target.value) || 0))} 
                className="input-field" 
                style={{ width: '100%', textAlign: 'right', fontSize: '12px' }} 
              />
            </div>
          </div>

          <div style={{ borderTop: '1px dashed var(--border-color)', margin: '6px 0', paddingTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', marginBottom: '8px', fontSize: '11px', fontWeight: '600' }}>
              <AlertTriangle size={12} />
              <span>미수 잔액 설정 (시스템 이관용 초기값)</span>
            </div>
            
            {/* Cash Receivable Amount */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
              <label style={{ color: 'var(--text-muted)' }}>초기 현금 미수금 (원)</label>
              <input 
                type="number" 
                value={receivableAmount} 
                onChange={e => setReceivableAmount(Math.max(0, parseInt(e.target.value) || 0))} 
                className="input-field" 
                style={{ width: '100%', textAlign: 'right', fontSize: '12px' }} 
              />
            </div>

            {/* Gold Balance weight */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: 'var(--text-muted)' }}>초기 순금 미수 중량 (24K g)</label>
              <input 
                type="number" 
                step="0.001"
                value={goldBalance} 
                onChange={e => setGoldBalance(Math.max(0, parseFloat(e.target.value) || 0))} 
                className="input-field" 
                style={{ width: '100%', textAlign: 'right', fontSize: '12px' }} 
              />
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button 
              type="button" 
              onClick={handleResetForm} 
              className="btn-primary" 
              style={{ flex: 1, background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', boxShadow: 'none', justifyContent: 'center' }}
            >
              취소
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              style={{ flex: 1.5, justifyContent: 'center' }}
            >
              {isEditMode ? '수정 완료' : '거래처 등록'}
            </button>
          </div>

        </form>
      </div>

      </div>
    </>
  );
};
