// src/App.tsx
import { useEffect, useState, lazy, Suspense } from 'react';
import { useErpStore } from './store/useErpStore';
import { ShoppingCart, BookOpen, RefreshCw, Coins, Gem, Users, FileText, Package, FileCheck, Menu, X, BarChart3, ShieldCheck } from 'lucide-react';
import { auth } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { Login } from './components/Login';

// Lazy loaded components

const OrderGrid = lazy(() => import('./components/OrderGrid').then(m => ({ default: m.OrderGrid })));
const CatalogManager = lazy(() => import('./components/CatalogManager').then(m => ({ default: m.CatalogManager })));
const RatesManager = lazy(() => import('./components/RatesManager').then(m => ({ default: m.RatesManager })));
const StoneManager = lazy(() => import('./components/StoneManager').then(m => ({ default: m.StoneManager })));
const StoneRegisterForm = lazy(() => import('./components/StoneRegisterForm').then(m => ({ default: m.StoneRegisterForm })));
const CatalogRegisterForm = lazy(() => import('./components/CatalogRegisterForm').then(m => ({ default: m.CatalogRegisterForm })));
const CatalogDetailView = lazy(() => import('./components/CatalogDetailView').then(m => ({ default: m.CatalogDetailView })));
const CatalogSelectPopup = lazy(() => import('./components/CatalogSelectPopup').then(m => ({ default: m.CatalogSelectPopup })));
const CustomerManager = lazy(() => import('./components/CustomerManager').then(m => ({ default: m.CustomerManager })));
const InvoicePrintView = lazy(() => import('./components/InvoicePrintView').then(m => ({ default: m.InvoicePrintView })));
const OrderList = lazy(() => import('./components/OrderList').then(m => ({ default: m.OrderList })));
const JewelryWorkList = lazy(() => import('./components/JewelryWorkList').then(m => ({ default: m.JewelryWorkList })));
const JewelryWorkListPrint = lazy(() => import('./components/JewelryWorkListPrint').then(m => ({ default: m.JewelryWorkListPrint })));
const ReleaseList = lazy(() => import('./components/ReleaseList').then(m => ({ default: m.ReleaseList })));
const CompletedLedger = lazy(() => import('./components/CompletedLedger').then(m => ({ default: m.CompletedLedger })));
const Statistics = lazy(() => import('./components/Statistics').then(m => ({ default: m.Statistics })));
const AuditLogManager = lazy(() => import('./components/AuditLogManager').then(m => ({ default: m.AuditLogManager })));

// 고급스러운 로딩 대체 UI
const LoadingFallback = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: '200px',
    color: 'var(--text-muted)',
    gap: '12px'
  }}>
    <RefreshCw className="animate-spin" size={24} style={{ color: 'var(--primary)' }} />
    <span style={{ fontSize: '16px', fontWeight: '500', letterSpacing: '0.5px' }}>
      화면을 불러오는 중...
    </span>
  </div>
);

function App() {
  const { fetchDb, prefetchDb, activeTab, setActiveTab, loading, customers, orders, currentUser, setCurrentUser, logout } = useErpStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, [setCurrentUser]);

  // 공정별 대기 건수 계산 (탭 배지용)
  const workListCount = orders.reduce((acc, o) => {
    const cnt = (o.items || []).filter(item => (item.status || o.status || '') === '공장발주').length;
    return acc + cnt;
  }, 0);
  const releaseListCount = orders.reduce((acc, o) => {
    const cnt = (o.items || []).filter(item => (item.status || o.status || '') === '출고대기').length;
    return acc + cnt;
  }, 0);
  const unpaidCount = orders.reduce((acc, o) => {
    const cnt = (o.items || []).filter(item => (item.status || o.status || '') === '출고완료' && (item.payment_status || '결제전') === '결제전').length;
    return acc + cnt;
  }, 0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Detect pop-up status from URL query parameter
  const queryParams = new URLSearchParams(window.location.search);
  const popupType = queryParams.get('popup');

  useEffect(() => {
    // Initialize DB and fetch based on popupType
    if (popupType === 'catalog_select') {
      fetchDb(['catalog']);
    } else if (popupType === 'stone') {
      fetchDb(['stones']);
    } else if (popupType === 'catalog') {
      fetchDb(['catalog', 'stones']);
    } else if (popupType === 'catalog_detail') {
      fetchDb(['catalog', 'stones']);
    } else if (popupType === 'invoice') {
      fetchDb(['orders', 'customers', 'gold_rates', 'stones', 'gold_transactions']);
    } else if (popupType === 'jewelry_work_list_print') {
      fetchDb(['orders', 'catalog']);
    } else {
      // 대시보드와 대장에 필요한 핵심 데이터셋만 우선 로드 (용량이 매우 큰 catalog와 stones 제외)
      fetchDb(['gold_rates', 'orders', 'customers', 'gold_transactions']);
    }

    // Listen for data update messages from child popup windows
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'db_update') {
        // 팝업에서 저장 완료 시 로컬 스토리지를 즉시 동기화하고 Firestore로부터 강제 전체 새로고침(forceFull) 실행
        useErpStore.getState().syncFromLocalStorage();
        fetchDb(undefined, true, true);
      } else if (event.data && event.data.type === 'select_catalog') {
        const { modelNumber, rowIndex } = event.data;
        useErpStore.getState().updateOrderItem(rowIndex, { model_number: modelNumber }, true);
      }
    };

    // Listen for storage change from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'wons_erp_cache') {
        useErpStore.getState().syncFromLocalStorage();
      }
      if (e.key && (
        e.key.includes('orders') || 
        e.key.includes('customers') || 
        e.key.includes('gold_rates') || 
        e.key.includes('stones') || 
        e.key.includes('catalog') || 
        e.key.includes('gold_transactions')
      )) {
        fetchDb();
      }
    };

    // Listen for window focus to catch any changes while tab was inactive
    const handleWindowFocus = () => {
      fetchDb();
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleWindowFocus);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [fetchDb, popupType]);

  // activeTab 전환 시 필요한 데이터를 지연 로딩(Lazy Loading)하는 useEffect
  useEffect(() => {
    if (popupType) return; // 팝업 모드일 때는 각 팝업 초기화 로직을 따름

    const state = useErpStore.getState();
    const neededCollections: ('gold_rates' | 'stones' | 'customers' | 'catalog' | 'orders' | 'gold_transactions')[] = [];

    // 1. 상품(카탈로그) 관련 탭 또는 세공 작업 탭 접근 시 catalog 데이터가 없으면 로드
    if (['catalog', 'order', 'work_list', 'statistics'].includes(activeTab)) {
      if (state.catalog.length === 0) {
        neededCollections.push('catalog');
      }
    }

    // 2. 스톤 관련 탭 또는 주문 작성 탭 접근 시 stones 데이터가 없으면 로드
    if (['stones', 'order', 'catalog'].includes(activeTab)) {
      if (state.stones.length === 0) {
        neededCollections.push('stones');
      }
    }

    if (neededCollections.length > 0) {
      fetchDb(neededCollections);
    }
  }, [activeTab, fetchDb, popupType]);

  // 최초 핵심 데이터 로드 완료 직후 (사용자가 대시보드를 보는 시점)
  // 백그라운드에서 용량이 큰 catalog, stones 데이터를 무소음(로딩 표시 없음)으로 미리 로드(Prefetch)
  useEffect(() => {
    if (popupType) return;
    
    // 초기 로딩이 완료된 상태(customers.length > 0)일 때만 작동
    if (!loading && customers.length > 0) {
      const state = useErpStore.getState();
      const needed: ('catalog' | 'stones')[] = [];
      
      if (state.catalog.length === 0) needed.push('catalog');
      if (state.stones.length === 0) needed.push('stones');
      
      if (needed.length > 0) {
        // 사용자 인터랙션의 병목을 방지하기 위해 1.5초 후 백그라운드로 가져옴
        const timer = setTimeout(() => {
          prefetchDb(needed);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, customers, prefetchDb, popupType]);

  // 로그인 검사 차단막
  if (!currentUser) {
    return <Suspense fallback={<LoadingFallback />}><Login /></Suspense>;
  }

  // Render popup forms directly if matching URL query parameter is found
  if (popupType === 'stone') {
    return <Suspense fallback={<LoadingFallback />}><StoneRegisterForm /></Suspense>;
  }

  if (popupType === 'catalog') {
    return <Suspense fallback={<LoadingFallback />}><CatalogRegisterForm /></Suspense>;
  }

  if (popupType === 'catalog_detail') {
    return <Suspense fallback={<LoadingFallback />}><CatalogDetailView /></Suspense>;
  }

  if (popupType === 'catalog_select') {
    return <Suspense fallback={<LoadingFallback />}><CatalogSelectPopup /></Suspense>;
  }

  if (popupType === 'invoice') {
    return <Suspense fallback={<LoadingFallback />}><InvoicePrintView /></Suspense>;
  }

  if (popupType === 'jewelry_work_list_print') {
    return <Suspense fallback={<LoadingFallback />}><JewelryWorkListPrint /></Suspense>;
  }

  // 최초 데이터가 없을 때 로딩 중이면, 고급스러운 로딩 오버레이 출력
  const isInitialLoading = loading && customers.length === 0;

  if (isInitialLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-base)',
        color: 'var(--text-main)',
        gap: '16px'
      }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: '17px', fontWeight: '600', letterSpacing: '0.5px' }}>
          실시간 클라우드 데이터 동기화 중...
        </span>
      </div>
    );
  }



  return (
    <div className="app-container">
      
      {/* Premium Navigation Header */}
      <header 
        className="glass-panel app-header" 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          padding: '12px 24px',
          background: 'linear-gradient(135deg, rgba(17, 19, 28, 0.8) 0%, rgba(9, 10, 15, 0.9) 100%)',
          gap: '24px'
        }}
      >
        {/* 모바일 전용 상단 타이틀 바 */}
        <div className="mobile-header-bar" style={{ display: 'none', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="gradient-text" style={{ fontFamily: 'var(--font-title)', fontWeight: '700', fontSize: '18px' }}>원스쥬얼리 B2B ERP</span>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="menu-toggle-btn btn-primary"
            style={{
              padding: '6px 12px',
              fontSize: '15px',
              background: isMenuOpen ? 'rgba(239, 68, 68, 0.1)' : 'rgba(212, 175, 55, 0.1)',
              color: isMenuOpen ? 'var(--danger)' : 'var(--primary)',
              border: isMenuOpen ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(212, 175, 55, 0.2)',
              boxShadow: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {isMenuOpen ? <X size={14} /> : <Menu size={14} />}
            {isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
          </button>
        </div>

        {/* Tab Navigation Menu */}
        <nav className={`app-nav ${isMenuOpen ? 'mobile-show' : 'mobile-hide'}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
          
          {/* 그룹 1: 모니터링 */}
          <div className="nav-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="nav-group-label" style={{ fontSize: '14px', color: 'rgba(212, 175, 55, 0.7)', fontWeight: '700', marginRight: '2px', borderRight: '1px solid rgba(255,255,255,0.15)', paddingRight: '8px', width: '80px', textAlign: 'right', display: 'inline-block' }}>모니터링</span>
            <div className="nav-buttons-container">

              <button
                onClick={() => { setActiveTab('statistics'); setIsMenuOpen(false); }}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '15px',
                  boxShadow: 'none',
                  background: activeTab === 'statistics' ? 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)' : 'transparent',
                  color: activeTab === 'statistics' ? 'var(--text-inverse)' : 'var(--text-muted)',
                  border: activeTab === 'statistics' ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginLeft: '8px'
                }}
              >
                <BarChart3 size={13} /> 통계 분석
              </button>

              <button
                onClick={() => { setActiveTab('audit_logs'); setIsMenuOpen(false); }}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '15px',
                  boxShadow: 'none',
                  background: activeTab === 'audit_logs' ? 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)' : 'transparent',
                  color: activeTab === 'audit_logs' ? 'var(--text-inverse)' : 'var(--text-muted)',
                  border: activeTab === 'audit_logs' ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginLeft: '8px'
                }}
              >
                <ShieldCheck size={13} /> 감사 로그
              </button>
            </div>
          </div>

          {/* 그룹 2: 마스터 정보 */}
          <div className="nav-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="nav-group-label" style={{ fontSize: '14px', color: 'rgba(212, 175, 55, 0.7)', fontWeight: '700', marginRight: '2px', borderRight: '1px solid rgba(255,255,255,0.15)', paddingRight: '8px', width: '80px', textAlign: 'right', display: 'inline-block' }}>마스터 정보</span>
            <div className="nav-buttons-container">
              <button
                onClick={() => { setActiveTab('customers'); setIsMenuOpen(false); }}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '15px',
                  boxShadow: 'none',
                  background: activeTab === 'customers' ? 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)' : 'transparent',
                  color: activeTab === 'customers' ? 'var(--text-inverse)' : 'var(--text-muted)',
                  border: activeTab === 'customers' ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Users size={13} /> 거래처
              </button>
              
              <button
                onClick={() => { setActiveTab('catalog'); setIsMenuOpen(false); }}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '15px',
                  boxShadow: 'none',
                  background: activeTab === 'catalog' ? 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)' : 'transparent',
                  color: activeTab === 'catalog' ? 'var(--text-inverse)' : 'var(--text-muted)',
                  border: activeTab === 'catalog' ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <BookOpen size={13} /> 상품
              </button>

              <button
                onClick={() => { setActiveTab('rates'); setIsMenuOpen(false); }}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '15px',
                  boxShadow: 'none',
                  background: activeTab === 'rates' ? 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)' : 'transparent',
                  color: activeTab === 'rates' ? 'var(--text-inverse)' : 'var(--text-muted)',
                  border: activeTab === 'rates' ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Coins size={13} /> 금 시세
              </button>
              
              <button
                onClick={() => { setActiveTab('stones'); setIsMenuOpen(false); }}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '15px',
                  boxShadow: 'none',
                  background: activeTab === 'stones' ? 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)' : 'transparent',
                  color: activeTab === 'stones' ? 'var(--text-inverse)' : 'var(--text-muted)',
                  border: activeTab === 'stones' ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Gem size={13} /> 스톤
              </button>
            </div>
          </div>

          {/* 그룹 3: 주요 공정 */}
          <div className="nav-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="nav-group-label" style={{ fontSize: '14px', color: 'rgba(212, 175, 55, 0.7)', fontWeight: '700', marginRight: '2px', borderRight: '1px solid rgba(255,255,255,0.15)', paddingRight: '8px', width: '80px', textAlign: 'right', display: 'inline-block' }}>주요 공정</span>
            <div className="nav-buttons-container">
              <button
                onClick={() => { setActiveTab('order'); setIsMenuOpen(false); }}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '15px',
                  boxShadow: 'none',
                  background: activeTab === 'order' ? 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)' : 'transparent',
                  color: activeTab === 'order' ? 'var(--text-inverse)' : 'var(--text-muted)',
                  border: activeTab === 'order' ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                id="nav-order-sheet"
              >
                <ShoppingCart size={13} /> 1. 주문 작성
              </button>
              
              <button
                onClick={() => { setActiveTab('orders'); setIsMenuOpen(false); }}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '15px',
                  boxShadow: 'none',
                  background: activeTab === 'orders' ? 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)' : 'transparent',
                  color: activeTab === 'orders' ? 'var(--text-inverse)' : 'var(--text-muted)',
                  border: activeTab === 'orders' ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FileText size={13} /> 2. 주문/명세서
              </button>
              
              <button
                onClick={() => { setActiveTab('work_list'); setIsMenuOpen(false); }}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '15px',
                  boxShadow: 'none',
                  background: activeTab === 'work_list' ? 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)' : 'transparent',
                  color: activeTab === 'work_list' ? 'var(--text-inverse)' : 'var(--text-muted)',
                  border: activeTab === 'work_list' ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RefreshCw size={13} /> 3. 세공 작업
                {workListCount > 0 && (
                  <span style={{
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '1px 6px',
                    minWidth: '18px',
                    textAlign: 'center',
                    lineHeight: '16px',
                  }}>{workListCount}</span>
                )}
              </button>
              
              <button
                onClick={() => { setActiveTab('release_list'); setIsMenuOpen(false); }}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '15px',
                  boxShadow: 'none',
                  background: activeTab === 'release_list' ? 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)' : 'transparent',
                  color: activeTab === 'release_list' ? 'var(--text-inverse)' : 'var(--text-muted)',
                  border: activeTab === 'release_list' ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Package size={13} /> 4. 출고 대기
                {releaseListCount > 0 && (
                  <span style={{
                    background: '#f59e0b',
                    color: '#000',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '1px 6px',
                    minWidth: '18px',
                    textAlign: 'center',
                    lineHeight: '16px',
                  }}>{releaseListCount}</span>
                )}
              </button>
              
              <button
                onClick={() => { setActiveTab('unpaid_ledger'); setIsMenuOpen(false); }}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '15px',
                  boxShadow: 'none',
                  background: activeTab === 'unpaid_ledger' ? 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)' : 'transparent',
                  color: activeTab === 'unpaid_ledger' ? 'var(--text-inverse)' : 'var(--text-muted)',
                  border: activeTab === 'unpaid_ledger' ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FileCheck size={13} /> 5. 미수 대장
                {unpaidCount > 0 && (
                  <span style={{
                    background: '#3b82f6',
                    color: '#fff',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '1px 6px',
                    minWidth: '18px',
                    textAlign: 'center',
                    lineHeight: '16px',
                  }}>{unpaidCount}</span>
                )}
              </button>

              <button
                onClick={() => { setActiveTab('paid_ledger'); setIsMenuOpen(false); }}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '15px',
                  boxShadow: 'none',
                  background: activeTab === 'paid_ledger' ? 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)' : 'transparent',
                  color: activeTab === 'paid_ledger' ? 'var(--text-inverse)' : 'var(--text-muted)',
                  border: activeTab === 'paid_ledger' ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FileCheck size={13} /> 6. 결제완료 대장
              </button>

              <button
                onClick={() => { setActiveTab('hold_ledger'); setIsMenuOpen(false); }}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '15px',
                  boxShadow: 'none',
                  background: activeTab === 'hold_ledger' ? 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)' : 'transparent',
                  color: activeTab === 'hold_ledger' ? 'var(--text-inverse)' : 'var(--text-muted)',
                  border: activeTab === 'hold_ledger' ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <FileCheck size={13} /> 7. 보류 대장
              </button>
            </div>
          </div>
        </nav>

        {/* User Auth Info & Logout Button */}
        {currentUser && (
          <div className="header-user-profile">
            <span style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
              🟢 <strong style={{ color: 'var(--primary)' }}>{currentUser.email}</strong> 님
            </span>
            <div className="header-user-profile-buttons">
              <button 
                onClick={async () => {
                  if (window.confirm("기기에 임시 저장된 캐시 데이터를 비우고, 클라우드 서버의 최신 데이터를 강제 전체 동기화하시겠습니까?")) {
                    localStorage.removeItem('wons_erp_cache');
                    localStorage.removeItem('last_fetched_catalog');
                    localStorage.removeItem('last_fetched_stones');
                    localStorage.removeItem('last_fetched_customers');
                    localStorage.removeItem('last_fetched_orders');
                    localStorage.removeItem('last_fetched_gold_rates');
                    localStorage.removeItem('last_fetched_gold_transactions');
                    localStorage.removeItem('last_fetched_audit_logs');
                    
                    try {
                      await useErpStore.getState().fetchDb(undefined, true, true);
                      alert("최신 데이터 강제 동기화가 완료되었습니다!");
                    } catch (err: any) {
                      alert(`동기화 중 오류가 발생했습니다: ${err.message || err}`);
                    }
                  }
                }} 
                className="btn-primary" 
                style={{ 
                  padding: '4px 10px', 
                  fontSize: '13px', 
                  background: 'rgba(212, 175, 55, 0.1)', 
                  color: 'var(--primary)', 
                  border: '1px solid rgba(212, 175, 55, 0.2)', 
                  boxShadow: 'none', 
                  cursor: 'pointer'
                }}
              >
                🔄 강제 동기화
              </button>
              <button 
                onClick={logout} 
                className="btn-primary" 
                style={{ 
                  padding: '4px 10px', 
                  fontSize: '13px', 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  color: '#ef4444', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                  boxShadow: 'none', 
                  cursor: 'pointer' 
                }}
              >
                로그아웃
              </button>
            </div>
          </div>
        )}

      </header>

      {/* Main Feature Rendering Panel */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <Suspense fallback={<LoadingFallback />}>
          {activeTab === 'customers' && <CustomerManager />}
          {activeTab === 'statistics' && <Statistics />}
          {activeTab === 'order' && <OrderGrid />}
          {activeTab === 'orders' && <OrderList />}
          {activeTab === 'catalog' && <CatalogManager />}
          {activeTab === 'rates' && <RatesManager />}
          {activeTab === 'stones' && <StoneManager />}
          {activeTab === 'work_list' && <JewelryWorkList />}
          {activeTab === 'release_list' && <ReleaseList />}
          {(activeTab === 'unpaid_ledger' || activeTab === 'paid_ledger' || activeTab === 'hold_ledger') && <CompletedLedger />}
          {activeTab === 'audit_logs' && <AuditLogManager />}
        </Suspense>
      </main>

      {/* Bottom Footer Info */}
      <footer style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--text-muted)', padding: '0 8px' }}>
        <span>&copy; 2026 원스쥬얼리 B2B ERP System. All Rights Reserved.</span>
        <span>🟢 실시간 클라우드 연결됨</span>
      </footer>

    </div>
  );
}

export default App;
