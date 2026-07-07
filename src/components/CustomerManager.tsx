import React, { useState, useEffect } from 'react';
import { useErpStore } from '../store/useErpStore';
import type { Customer } from '../firebase/mockDb';
import { UserPlus, Search, Edit2, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';


export const CustomerManager: React.FC = () => {
  const { customers, saveCustomer, deleteCustomer } = useErpStore();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  // Reset pagination on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterGrade]);

  // Form state
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [note, setNote] = useState('');
  const [grade, setGrade] = useState<number>(1);
  const [lossRate, setLossRate] = useState<number>(10); // 기본 해리 10%
  const [tradeType, setTradeType] = useState<'weight' | 'price'>('weight'); // 기본 중량 거래
  const [businessNumber, setBusinessNumber] = useState('');
  const [goldBalance, setGoldBalance] = useState<number>(0);
  const [receivableAmount, setReceivableAmount] = useState<number>(0);
  const [isReceivableEditable, setIsReceivableEditable] = useState(false);


  // Load customer data to form for editing
  const handleSelectCustomer = (cust: Customer) => {
    setIsEditMode(true);
    setSelectedCustomerId(cust.customer_id);
    setCode(cust.code);
    setName(cust.name);
    setOwnerName(cust.owner_name || '');
    setPhone(cust.phone || '');
    setMobile(cust.mobile || '');
    setNote(cust.note || '');
    setGrade(cust.grade);
    setLossRate(cust.loss_rate !== undefined ? cust.loss_rate : 10);
    setTradeType(cust.trade_type || 'weight');
    setBusinessNumber(cust.business_number || '');
    setGoldBalance(cust.gold_balance_24k_g || 0);
    setReceivableAmount(cust.receivable_amount || 0);
    setIsReceivableEditable(false); // 수정 모드 진입 시 처음에는 잔액 수정 비활성화
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
    setMobile('');
    setNote('');
    setGrade(1);
    setLossRate(10);
    setTradeType('weight');
    setBusinessNumber('');
    setGoldBalance(0);
    setReceivableAmount(0);
    setIsReceivableEditable(false);
    setIsFormOpen(false); // 리셋 시 폼 닫기 (신규 등록 전환)
  };

  // Submit Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('거래처명을 입력해주세요.');
      return;
    }

    // 신규 등록 시 일련번호 최댓값+1 로 자동 채번 (C-번호 형식)
    let finalCustomerId = selectedCustomerId;
    let finalCode = code;

    if (!isEditMode) {
      const numericIds = customers
        .map(c => {
          const num = parseInt(c.customer_id.replace('cust_', ''));
          return isNaN(num) ? 0 : num;
        })
        .filter(n => n > 0);
      const maxNo = numericIds.length > 0 ? Math.max(...numericIds) : 0;
      const nextNo = maxNo + 1;
      
      finalCustomerId = `cust_${nextNo}`;
      finalCode = `C-${nextNo}`;
    }

    if (!finalCode.trim()) {
      alert('거래처코드 생성에 실패했습니다.');
      return;
    }

    const customerData: Customer = {
      customer_id: finalCustomerId!,
      name: name.trim(),
      code: finalCode.trim(),
      grade,
      owner_name: ownerName.trim(),
      phone: phone.trim(),
      mobile: mobile.trim(),
      loss_rate: Number(lossRate),
      trade_type: tradeType,
      business_number: businessNumber.trim(),
      gold_balance_24k_g: Number(goldBalance),
      receivable_amount: Number(receivableAmount),
      note: note.trim(),
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

  const totalPages = Math.ceil(filteredCustomers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + pageSize);

  // Generate pages to show (max 5 pages shown around current page)
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPageButtons = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    
    if (endPage - startPage < maxPageButtons - 1) {
      startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  };

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
            <h2 style={{ fontSize: '19px', fontWeight: '600', fontFamily: 'var(--font-title)', margin: 0 }}>거래처 마스터 관리</h2>
          </div>
          
          <button
            className="btn-primary mobile-customer-add-btn"
            onClick={() => {
              handleResetForm();
              setIsFormOpen(true);
            }}
            style={{ padding: '6px 14px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <UserPlus size={14} />
            <span>신규 등록</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="customer-filter-toolbar" style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '14px' }}>거래처 검색:</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="거래처명 / 코드 / 대표자..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '30px', fontSize: '15px', width: '220px', height: '32px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '14px' }}>등급 필터:</label>
            <select
              value={filterGrade}
              onChange={e => setFilterGrade(e.target.value)}
              className="input-field"
              style={{ fontSize: '15px', height: '32px', padding: '0 8px' }}
            >
              <option value="all">모든 등급</option>
              <option value="1">1등급</option>
              <option value="2">2등급</option>
              <option value="3">3등급</option>
              <option value="4">4등급</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', fontSize: '14px', color: 'var(--text-muted)' }}>
            조회 결과: <strong style={{ color: 'var(--primary)' }}>{filteredCustomers.length}건</strong> / 전체 {customers.length}건
          </div>
        </div>

        {/* Count indicators & Classification Descriptions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', margin: '0' }}>
          <div style={{ display: 'flex', gap: '12px', fontSize: '13px' }}>
            <span><strong>등급구분:</strong> 1등(최우수) 2등(일반) 3등(신규) 4등(소매)</span>
            <span style={{ color: 'var(--border-color)', opacity: 0.3 }}>|</span>
            <span><strong>거래구분:</strong> 중량(순금 미수) / 시세(현금 미수)</span>
          </div>
        </div>

        {/* Customer Table */}
        <div className="table-responsive" style={{ flex: 1 }}>
          <table style={{ width: '100%', minWidth: '1150px', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '15px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0, 0, 0, 0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                <th style={{ padding: '10px', width: '110px', fontWeight: '600' }}>등록날짜</th>
                <th style={{ padding: '10px', width: '160px', fontWeight: '600' }}>거래처명</th>
                <th style={{ padding: '10px', width: '90px', fontWeight: '600' }}>대표자명</th>
                <th style={{ padding: '10px', width: '110px', fontWeight: '600' }}>전화</th>
                <th style={{ padding: '10px', width: '110px', fontWeight: '600' }}>핸드폰</th>
                <th style={{ padding: '10px', width: '80px', fontWeight: '600' }}>공급등급</th>
                <th style={{ padding: '10px', width: '80px', fontWeight: '600' }}>거래형태</th>
                <th style={{ padding: '10px', width: '90px', fontWeight: '600' }}>해리적용율</th>
                <th style={{ padding: '10px', width: '140px', fontWeight: '600' }}>초기현금 미수(원)</th>
                <th style={{ padding: '10px', width: '130px', fontWeight: '600' }}>초기순금미수(g)</th>
                <th style={{ padding: '10px', width: '90px', textAlign: 'center', fontWeight: '600' }}>작업</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    등록된 거래처가 없거나 검색 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((cust, idx) => {
                  return (
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
                      <td style={{ padding: '10px', width: '110px', fontWeight: '500', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cust.created_at ? cust.created_at.split('T')[0] : new Date().toISOString().split('T')[0]}
                      </td>
                      <td style={{ padding: '10px', width: '160px', fontWeight: '600', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cust.name}</td>
                      <td style={{ padding: '10px', width: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cust.owner_name || '-'}</td>
                      <td style={{ padding: '10px', width: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cust.phone || '-'}</td>
                      <td style={{ padding: '10px', width: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cust.mobile || '-'}</td>
                      <td style={{ padding: '10px', width: '80px' }}>
                        <span className="badge badge-warning" style={{ fontSize: '14px', padding: '2px 5px', background: 'rgba(212, 175, 55, 0.1)' }}>
                          {(!cust.grade || isNaN(cust.grade)) ? '1' : cust.grade}등
                        </span>
                      </td>
                      <td style={{ padding: '10px', width: '80px' }}>
                        <span style={{ 
                          fontSize: '14px', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          background: cust.trade_type === 'weight' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                          color: cust.trade_type === 'weight' ? '#3b82f6' : '#10b981'
                        }}>
                          {cust.trade_type === 'weight' ? '중량' : '시세'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', width: '90px', fontWeight: '600' }}>
                        {cust.loss_rate !== undefined ? `${cust.loss_rate}%` : '10%'}
                      </td>
                      <td style={{ 
                        padding: '10px', 
                        width: '140px', 
                        fontWeight: '600', 
                        color: cust.receivable_amount > 0 ? 'var(--danger)' : cust.receivable_amount < 0 ? '#10b981' : 'var(--text-muted)', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }}>
                        {cust.receivable_amount < 0 
                          ? `선수금 ${Math.abs(cust.receivable_amount).toLocaleString()}원` 
                          : `${cust.receivable_amount.toLocaleString()}원`}
                      </td>
                      <td style={{ 
                        padding: '10px', 
                        width: '130px', 
                        fontWeight: '600', 
                        color: cust.gold_balance_24k_g > 0 ? 'var(--primary)' : cust.gold_balance_24k_g < 0 ? '#10b981' : 'var(--text-muted)', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }}>
                        {cust.gold_balance_24k_g < 0 
                          ? `선수금 ${Math.abs(cust.gold_balance_24k_g).toFixed(3)}g` 
                          : `${cust.gold_balance_24k_g.toFixed(3)}g`}
                      </td>
                      <td style={{ padding: '10px', width: '90px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleSelectCustomer(cust)}
                            className="btn-primary"
                            style={{ padding: '4px 8px', fontSize: '14px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
                            title="상세 수정"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(cust.customer_id, cust.name)}
                            className="btn-primary"
                            style={{ padding: '4px 8px', fontSize: '14px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', boxShadow: 'none' }}
                            title="거래처 삭제"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="btn-primary"
              style={{ 
                fontSize: '12px', 
                padding: '4px 10px', 
                background: currentPage === 1 ? 'rgba(0,0,0,0.02)' : 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)', 
                color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-inverse)', 
                border: currentPage === 1 ? '1px solid var(--border-color)' : 'none',
                boxShadow: currentPage === 1 ? 'none' : '0 2px 6px rgba(170, 133, 19, 0.15)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              이전
            </button>
            
            {getPageNumbers().map(page => {
              const isActive = page === currentPage;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                    background: isActive ? 'rgba(170, 133, 19, 0.15)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text-main)',
                    fontWeight: isActive ? 'bold' : 'normal',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {page}
                </button>
              );
            })}
            
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="btn-primary"
              style={{ 
                fontSize: '12px', 
                padding: '4px 10px', 
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
      </div>

      {/* RIGHT: Register/Edit Form Panel */}
      <div className={`glass-panel animate-fade-in customer-form-panel ${isFormOpen ? 'mobile-show' : 'mobile-hide'}`}>
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--primary)' }}>
            {isEditMode ? '거래처 정보 수정' : '신규 거래처 등록'}
          </h3>
          {isEditMode && (
            <button 
              onClick={handleResetForm} 
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '15px' }}
            >
              <RotateCcw size={12} /> 신규등록 전환
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '15px' }}>
          
          {/* Customer Code (ReadOnly & Disabled) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ color: 'var(--text-muted)' }}>거래처코드</label>
            <input 
              type="text" 
              value={isEditMode ? code : '(저장 시 자동 부여)'} 
              className="input-field" 
              style={{ width: '100%', fontSize: '15px', backgroundColor: 'rgba(0,0,0,0.03)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
              disabled
              readOnly
            />
          </div>

          {/* Customer Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ color: 'var(--text-muted)' }}>거래처명 <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="예: 종로 골드라인"
              className="input-field" 
              style={{ width: '100%', fontSize: '15px' }}
              required 
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
              style={{ width: '100%', fontSize: '15px' }}
            />
          </div>

          {/* Phone Number & Mobile Number */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: 'var(--text-muted)' }}>전화</label>
              <input 
                type="text" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                placeholder="예: 02-123-4567"
                className="input-field" 
                style={{ width: '100%', fontSize: '15px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: 'var(--text-muted)' }}>핸드폰</label>
              <input 
                type="text" 
                value={mobile} 
                onChange={e => setMobile(e.target.value)} 
                placeholder="예: 010-1234-5678"
                className="input-field" 
                style={{ width: '100%', fontSize: '15px' }}
              />
            </div>
          </div>

          {/* Customer Grade (1 to 4) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ color: 'var(--text-muted)' }}>공급등급</label>
            <select
              value={grade}
              onChange={e => setGrade(Number(e.target.value))}
              className="input-field"
              style={{ width: '100%', fontSize: '15px' }}
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
                style={{ width: '100%', fontSize: '15px' }}
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
                style={{ width: '100%', textAlign: 'right', fontSize: '15px' }} 
              />
            </div>
          </div>

          {/* Memo / Note */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ color: 'var(--text-muted)' }}>메모</label>
            <input 
              type="text" 
              value={note} 
              onChange={e => setNote(e.target.value)} 
              placeholder="예: 특이사항이나 메모할 내용 기입"
              className="input-field" 
              style={{ width: '100%', fontSize: '15px' }}
            />
          </div>

          <div style={{ borderTop: '1px dashed var(--border-color)', margin: '6px 0', paddingTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontSize: '14px', fontWeight: '600' }}>
                <AlertTriangle size={12} />
                <span>미수 잔액 설정 (시스템 이관용 초기값)</span>
              </div>
              {isEditMode && !isReceivableEditable && (
                <button
                  type="button"
                  onClick={() => {
                    const confirmEdit = window.confirm("주의: 초기 미수 잔액을 직접 수정하면 기존 거래 장부 누계 금액과 달라질 수 있습니다.\n정말로 수정을 활성화하시겠습니까?");
                    if (confirmEdit) {
                      setIsReceivableEditable(true);
                    }
                  }}
                  className="btn-primary"
                  style={{
                    padding: '2px 8px',
                    fontSize: '12px',
                    background: '#e2e8f0',
                    color: '#475569',
                    border: '1.5px solid #94a3b8',
                    boxShadow: 'none',
                    cursor: 'pointer'
                  }}
                >
                  수정
                </button>
              )}
            </div>
            
            {/* Cash Receivable Amount */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
              <label style={{ color: 'var(--text-muted)' }}>초기현금 미수(원)</label>
              <input 
                type="number" 
                value={receivableAmount} 
                disabled={isEditMode && !isReceivableEditable}
                onChange={e => setReceivableAmount(Math.max(0, parseInt(e.target.value) || 0))} 
                className="input-field" 
                style={{ 
                  width: '100%', 
                  textAlign: 'right', 
                  fontSize: '15px',
                  background: (isEditMode && !isReceivableEditable) ? 'rgba(0,0,0,0.05)' : undefined,
                  cursor: (isEditMode && !isReceivableEditable) ? 'not-allowed' : undefined,
                  color: (isEditMode && !isReceivableEditable) ? 'var(--text-muted)' : undefined
                }} 
              />
            </div>

            {/* Gold Balance weight */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ color: 'var(--text-muted)' }}>초기순금미수(g)</label>
              <input 
                type="number" 
                step="0.001"
                value={goldBalance} 
                disabled={isEditMode && !isReceivableEditable}
                onChange={e => setGoldBalance(Math.max(0, parseFloat(e.target.value) || 0))} 
                className="input-field" 
                style={{ 
                  width: '100%', 
                  textAlign: 'right', 
                  fontSize: '15px',
                  background: (isEditMode && !isReceivableEditable) ? 'rgba(0,0,0,0.05)' : undefined,
                  cursor: (isEditMode && !isReceivableEditable) ? 'not-allowed' : undefined,
                  color: (isEditMode && !isReceivableEditable) ? 'var(--text-muted)' : undefined
                }} 
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
