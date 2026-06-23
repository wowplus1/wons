// src/App.tsx
import { useEffect, useState } from 'react';
import { useErpStore } from './store/useErpStore';
import { Dashboard } from './components/Dashboard';
import { OrderGrid } from './components/OrderGrid';
import { CatalogManager } from './components/CatalogManager';
import { RatesManager } from './components/RatesManager';
import { StoneManager } from './components/StoneManager';
import { StoneRegisterForm } from './components/StoneRegisterForm';
import { CatalogRegisterForm } from './components/CatalogRegisterForm';
import { CatalogDetailView } from './components/CatalogDetailView';
import { CatalogSelectPopup } from './components/CatalogSelectPopup';
import { CustomerManager } from './components/CustomerManager';
import { InvoicePrintView } from './components/InvoicePrintView';
import { OrderList } from './components/OrderList';
import { JewelryWorkList } from './components/JewelryWorkList';
import { JewelryWorkListPrint } from './components/JewelryWorkListPrint';
import { ReleaseList } from './components/ReleaseList';
import { CompletedLedger } from './components/CompletedLedger';
import { LayoutDashboard, ShoppingCart, BookOpen, RefreshCw, Coins, Gem, Users, FileText, Package, FileCheck, Menu, X } from 'lucide-react';

function App() {
  const { fetchDb, updateGoldRate, currentRates, activeTab, setActiveTab } = useErpStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Detect pop-up status from URL query parameter
  const queryParams = new URLSearchParams(window.location.search);
  const popupType = queryParams.get('popup');

  useEffect(() => {
    // Initialize DB and fetch
    fetchDb();

    // Listen for data update messages from child popup windows
    const handleMessage = (event: MessageEvent) => {
      if (event.data === 'db_update') {
        fetchDb(); // Reload data in parent window
      } else if (event.data && event.data.type === 'select_catalog') {
        const { modelNumber, rowIndex } = event.data;
        useErpStore.getState().updateOrderItem(rowIndex, { model_number: modelNumber });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [fetchDb]);

  // Render popup forms directly if matching URL query parameter is found
  if (popupType === 'stone') {
    return <StoneRegisterForm />;
  }

  if (popupType === 'catalog') {
    return <CatalogRegisterForm />;
  }

  if (popupType === 'catalog_detail') {
    return <CatalogDetailView />;
  }

  if (popupType === 'catalog_select') {
    return <CatalogSelectPopup />;
  }

  if (popupType === 'invoice') {
    return <InvoicePrintView />;
  }

  if (popupType === 'jewelry_work_list_print') {
    return <JewelryWorkListPrint />;
  }

  // Simulate daily gold market rate changes (front-end playground helper)
  const handleSimulateRateChange = () => {
    if (!currentRates) return;
    
    const changeFactor = 1 + (Math.random() * 0.04 - 0.02);
    const nextBuy24k = Math.round(currentRates.buy_rates.gold_24k_per_g * changeFactor);
    const nextRates = {
      date: new Date().toISOString().slice(0, 10),
      buy_rates: {
        gold_24k_per_g: nextBuy24k,
        gold_18k_per_g: Math.round(nextBuy24k * 0.75),
        gold_14k_per_g: Math.round(nextBuy24k * 0.585),
        silver_per_g: Math.round(currentRates.buy_rates.silver_per_g * changeFactor),
        gold_24k_per_don: Math.round(nextBuy24k * 3.75),
      },
      sell_rates: {
        gold_24k_per_g: Math.round(nextBuy24k * 1.045),
        gold_18k_per_g: Math.round(nextBuy24k * 1.045 * 0.75),
        gold_14k_per_g: Math.round(nextBuy24k * 1.045 * 0.585),
        silver_per_g: Math.round(currentRates.sell_rates.silver_per_g * changeFactor),
        gold_24k_per_don: Math.round(nextBuy24k * 1.045 * 3.75),
      },
      updated_at: new Date().toISOString(),
      updated_by: 'system_simulation'
    };

    updateGoldRate(nextRates);
    alert(`금일 시장 금 시세 변동이 발생했습니다.\n새로운 순금 매입 시세(돈당): ${nextRates.buy_rates.gold_24k_per_don.toLocaleString()}원`);
  };

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
          <span className="gradient-text" style={{ fontFamily: 'var(--font-title)', fontWeight: '700', fontSize: '15px' }}>GOLDLINK B2B ERP</span>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="menu-toggle-btn btn-primary"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
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
            <span className="nav-group-label" style={{ fontSize: '11px', color: 'rgba(212, 175, 55, 0.7)', fontWeight: '700', marginRight: '2px', borderRight: '1px solid rgba(255,255,255,0.15)', paddingRight: '8px', width: '64px', textAlign: 'right', display: 'inline-block' }}>모니터링</span>
            <div className="nav-buttons-container">
              <button
                onClick={() => { setActiveTab('dashboard'); setIsMenuOpen(false); }}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  boxShadow: 'none',
                  background: activeTab === 'dashboard' ? 'linear-gradient(135deg, var(--primary) 0%, #aa8513 100%)' : 'transparent',
                  color: activeTab === 'dashboard' ? 'var(--text-inverse)' : 'var(--text-muted)',
                  border: activeTab === 'dashboard' ? 'none' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <LayoutDashboard size={13} /> 현황판 (대시보드)
              </button>
            </div>
          </div>

          {/* 그룹 2: 마스터 정보 */}
          <div className="nav-group" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="nav-group-label" style={{ fontSize: '11px', color: 'rgba(212, 175, 55, 0.7)', fontWeight: '700', marginRight: '2px', borderRight: '1px solid rgba(255,255,255,0.15)', paddingRight: '8px', width: '64px', textAlign: 'right', display: 'inline-block' }}>마스터 정보</span>
            <div className="nav-buttons-container">
              <button
                onClick={() => { setActiveTab('customers'); setIsMenuOpen(false); }}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
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
                  fontSize: '12px',
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
                  fontSize: '12px',
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
                  fontSize: '12px',
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
            <span className="nav-group-label" style={{ fontSize: '11px', color: 'rgba(212, 175, 55, 0.7)', fontWeight: '700', marginRight: '2px', borderRight: '1px solid rgba(255,255,255,0.15)', paddingRight: '8px', width: '64px', textAlign: 'right', display: 'inline-block' }}>주요 공정</span>
            <div className="nav-buttons-container">
              <button
                onClick={() => { setActiveTab('order'); setIsMenuOpen(false); }}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
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
                  fontSize: '12px',
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
                  fontSize: '12px',
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
              </button>
              
              <button
                onClick={() => { setActiveTab('release_list'); setIsMenuOpen(false); }}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
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
              </button>
              
              <button
                onClick={() => { setActiveTab('unpaid_ledger'); setIsMenuOpen(false); }}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
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
              </button>

              <button
                onClick={() => { setActiveTab('paid_ledger'); setIsMenuOpen(false); }}
                className="btn-primary"
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
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
                  fontSize: '12px',
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

        {/* Global Action Tools */}
        <div className={`global-action-tools ${isMenuOpen ? 'mobile-show' : 'mobile-hide'}`} style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={handleSimulateRateChange}
            className="btn-primary"
            style={{
              fontSize: '11px',
              padding: '6px 12px',
              background: 'rgba(255, 255, 255, 0.03)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-color)',
              boxShadow: 'none'
            }}
            title="시세 임의 변동 시뮬레이션"
          >
            <RefreshCw size={12} /> 시세 시뮬레이션
          </button>
        </div>
      </header>

      {/* Main Feature Rendering Panel */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'customers' && <CustomerManager />}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'order' && <OrderGrid />}
        {activeTab === 'orders' && <OrderList />}
        {activeTab === 'catalog' && <CatalogManager />}
        {activeTab === 'rates' && <RatesManager />}
        {activeTab === 'stones' && <StoneManager />}
        {activeTab === 'work_list' && <JewelryWorkList />}
        {activeTab === 'release_list' && <ReleaseList />}
        {(activeTab === 'unpaid_ledger' || activeTab === 'paid_ledger' || activeTab === 'hold_ledger') && <CompletedLedger />}
      </main>

      {/* Bottom Footer Info */}
      <footer style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', padding: '0 8px' }}>
        <span>&copy; 2026 GOLDLINK B2B ERP System. All Rights Reserved.</span>
        <span>클라우드 동기화 상태: 온라인 (Local Mocking)</span>
      </footer>

    </div>
  );
}

export default App;
