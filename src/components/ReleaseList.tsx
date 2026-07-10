// src/components/ReleaseList.tsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useErpStore, getCatalogLaborFees } from '../store/useErpStore';
import { Package, CheckCircle, Printer, X } from 'lucide-react';

interface ReleaseItemRow {
  id: string; // `release-item::${order_id}::${item_id}::${itemIdx}`
  orderId: string;
  orderDate: string;
  customerName: string;
  customerId: string;
  model: string;
  material: string;
  color: string;
  size: string;
  quantity: number;
  stoneMainText: string;
  stoneSubText: string;
  note: string;
  laborSingle: number;
  totalAmount: number;
  imageUrl: string;
  estimatedWeightG: number;
  itemId: number;
  actualWeightG?: number;
  division?: string;
  stepWeights?: any;

  buyPrice: number;
  laborBaseExtra: number;
  laborMainSub: number;
  stonesCountTotal: number;
  goldWeightG: number;
  stonesWeightTotal: number;
}

export const ReleaseList: React.FC = () => {
  const { orders, catalog, stones, updateMultipleItemsStatus, fetchDb, setActiveTab, currentRates } = useErpStore();
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  useEffect(() => {
    setCurrentPage(1);
    setCheckedItems(new Set());
  }, [orders]);

  // 거래처 클릭 시 띄울 인보이스(명세서) 팝업용 상태
  const [activeInvoiceModalCustomer, setActiveInvoiceModalCustomer] = useState<{
    customerId: string;
    customerName: string;
    items: ReleaseItemRow[];
  } | null>(null);
  const [invoiceCheckedItems, setInvoiceCheckedItems] = useState<Set<string>>(new Set());

  // 컴포넌트 마운트 시 최신 데이터 동기화
  useEffect(() => {
    fetchDb();
  }, [fetchDb]);

  // 거래처별 출고대기 명세서 모달 열기
  const handleOpenInvoiceModal = (customerId: string, customerName: string) => {
    const customerItems = releaseItems.filter(item => item.customerId === customerId);
    if (customerItems.length === 0) {
      alert('해당 거래처의 출고 대기 중인 품목이 없습니다.');
      return;
    }
    
    // 기본적으로 모두 선택 상태로 설정
    const initialChecked = new Set<string>();
    customerItems.forEach(item => initialChecked.add(item.id));
    setInvoiceCheckedItems(initialChecked);
    
    setActiveInvoiceModalCustomer({
      customerId,
      customerName,
      items: customerItems
    });
  };

  // 모달 테이블 체크박스 핸들러
  const handleToggleInvoiceRow = (id: string) => {
    const next = new Set(invoiceCheckedItems);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setInvoiceCheckedItems(next);
  };

  const isAllInvoiceChecked = activeInvoiceModalCustomer && 
    activeInvoiceModalCustomer.items.length > 0 && 
    activeInvoiceModalCustomer.items.every(r => invoiceCheckedItems.has(r.id));

  const handleToggleAllInvoice = () => {
    if (!activeInvoiceModalCustomer) return;
    if (isAllInvoiceChecked) {
      const next = new Set(invoiceCheckedItems);
      activeInvoiceModalCustomer.items.forEach(r => next.delete(r.id));
      setInvoiceCheckedItems(next);
    } else {
      const next = new Set(invoiceCheckedItems);
      activeInvoiceModalCustomer.items.forEach(r => next.add(r.id));
      setInvoiceCheckedItems(next);
    }
  };

  // 선택 품목 기반 거래명세서 출력 (가상 주문을 구성해 sessionStorage에 바인딩)
  const handlePrintInvoice = () => {
    if (!activeInvoiceModalCustomer) return;
    
    const selectedRows = activeInvoiceModalCustomer.items.filter(item => invoiceCheckedItems.has(item.id));
    if (selectedRows.length === 0) {
      alert('출력할 품목을 최소 1개 이상 선택해 주세요.');
      return;
    }
    
    const virtualItems = selectedRows.map(row => {
      const originOrder = orders.find(o => o.order_id === row.orderId);
      const originItem = originOrder?.items?.find(i => i.item_id === row.itemId);
      
      return {
        item_id: row.itemId,
        model_number: row.model,
        material: row.material,
        color: row.color,
        size: row.size,
        quantity: row.quantity,
        estimated_weight_g: row.actualWeightG || row.estimatedWeightG,
        gold_weight: row.goldWeightG,
        qty_main: originItem?.qty_main || 0,
        qty_sub: originItem?.qty_sub || 0,
        labor_base: originItem?.labor_base || 0,
        labor_extra: originItem?.labor_extra || 0,
        labor_main: originItem?.labor_main || 0,
        labor_sub: originItem?.labor_sub || 0,
        stone_main_id: originItem?.stone_main_id || '',
        stone_main_name: originItem?.stone_main_name || '',
        stone_weight_ea: originItem?.stone_weight_ea || 0,
        stone_sub_id: originItem?.stone_sub_id || '',
        stone_sub_name: originItem?.stone_sub_name || '',
        note: row.note || '',
        division: row.division || '판매',
        calculated_price: row.totalAmount
      };
    });
    
    const firstRow = selectedRows[0];
    const originOrderForCustomer = orders.find(o => o.order_id === firstRow.orderId);
    
    const virtualOrder = {
      order_id: `V-RELEASE-${Date.now()}`,
      order_date: new Date().toISOString(),
      customer_snapshot: originOrderForCustomer?.customer_snapshot || {
        customer_id: firstRow.customerId,
        name: firstRow.customerName,
        phone: '',
        loss_rate: 0,
        trade_type: 'price'
      },
      gold_rate_snapshot: originOrderForCustomer?.gold_rate_snapshot || currentRates || {
        buy_rates: { gold_24k_per_g: 100000, gold_18k_per_g: 75000, gold_14k_per_g: 58500, silver_per_g: 1500, gold_24k_per_don: 375000 },
        sell_rates: { gold_24k_per_g: 105000, gold_18k_per_g: 78500, gold_14k_per_g: 61500, silver_per_g: 1600, gold_24k_per_don: 393750 }
      },
      items: virtualItems
    };
    
    sessionStorage.setItem('selected_invoice_order', JSON.stringify(virtualOrder));
    
    const w = 1100;
    const h = 850;
    const left = window.screen.width / 2 - w / 2;
    const top = window.screen.height / 2 - h / 2;
    
    window.open(
      `./?popup=invoice&source=release`,
      `release_invoice_print_${firstRow.customerId}`,
      `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );
  };

  // 1. 현재 '출고대기' 상태인 주문에서 가공 품목 필터링하여 테이블 행 구축
  const releaseItems = React.useMemo(() => {
    const items: ReleaseItemRow[] = [];

    orders.forEach(order => {
      try {
        const itemsList = order.items || [];
        itemsList.forEach((item, itemIdx) => {
          try {
            const itemStatus = item.status || order.status || '접수';
            if (itemStatus !== '출고대기') return;

            const normModel = (m: string) => (m || '').replace(/\s+/g, '').toUpperCase();
            const catalogItem = catalog.find(c => normModel(c.model_number) === normModel(item.model_number));
            const imageUrl = catalogItem?.images?.[0] || '';

            // 개당 공임비 (기본+추가+스톤공임)
            const baseExtra = (item.labor_base || 0) + (item.labor_extra || 0);
            const stoneLabor = ((item.labor_main || 0) * (item.qty_main || 0)) + ((item.labor_sub || 0) * (item.qty_sub || 0));
            const laborSingle = baseExtra + stoneLabor;

            // 공임단가 세부 계산
            const laborBaseExtra = (item.labor_base || 0) + (item.labor_extra || 0);
            const laborMainSub = (item.labor_main || 0) + (item.labor_sub || 0);

            // 알수합계
            const stonesCountTotal = (item.qty_main || 0) + (item.qty_sub || 0);

            // 중량(스톤)
            let subStoneWeightEa = 0;
            if (item.stone_sub_id) {
              const subStone = stones.find(s => s.stone_id === item.stone_sub_id);
              subStoneWeightEa = subStone?.weight_carat || 0;
            }
            const stonesWeightTotal = (item.qty_main || 0) * (item.stone_weight_ea || 0) + (item.qty_sub || 0) * subStoneWeightEa;

            // 모델 구매원가 계산
            let modelCost = item.labor_cost || 0;
            if (catalogItem) {
              const feeData = getCatalogLaborFees(catalogItem, item.material, item.color, item.grade || 1);
              modelCost = feeData.laborCost || modelCost;
            }

            // 스톤 구매단가 합계 계산
            let totalStonePurchaseCost = 0;
            if (catalogItem && catalogItem.default_stones && catalogItem.default_stones.length > 0) {
              catalogItem.default_stones.forEach(ds => {
                const stone = stones.find(s => s.stone_id === ds.stone_id);
                const purchasePrice = stone?.purchase_price || 0;
                totalStonePurchaseCost += ds.quantity * purchasePrice;
              });
            } else {
              let mainStonePurchasePrice = 0;
              if (item.stone_main_id) {
                const mainStone = stones.find(s => s.stone_id === item.stone_main_id);
                mainStonePurchasePrice = mainStone?.purchase_price || 0;
              }

              let subStonePurchasePrice = 0;
              if (item.stone_sub_id) {
                const subStone = stones.find(s => s.stone_id === item.stone_sub_id);
                subStonePurchasePrice = subStone?.purchase_price || 0;
              }

              totalStonePurchaseCost = ((item.qty_main || 0) * mainStonePurchasePrice) + ((item.qty_sub || 0) * subStonePurchasePrice);
            }
            const finalLaborCost = modelCost + totalStonePurchaseCost;

            items.push({
              id: `release-item::${order.order_id}::${item.item_id}::${itemIdx}`,
              orderId: order.order_id,
              orderDate: order.order_date,
              customerName: order.customer_snapshot?.name || '알수없음',
              customerId: order.customer_snapshot?.customer_id || '',
              model: item.model_number,
              material: item.material,
              color: item.color,
              size: item.size || '',
              quantity: item.quantity || 1,
              stoneMainText: item.stone_main_name ? `${item.stone_main_name} (${item.qty_main || 0}알)` : '',
              stoneSubText: item.stone_sub_name ? `${item.stone_sub_name} (${item.qty_sub || 0}알)` : '',
              note: item.note || '',
              laborSingle,
              totalAmount: item.calculated_price || 0,
              imageUrl,
              estimatedWeightG: item.estimated_weight_g || 0,
              itemId: item.item_id,
              actualWeightG: item.actual_weight_g,
              division: item.division,
              stepWeights: item.step_weights,
              
              buyPrice: finalLaborCost,
              laborBaseExtra,
              laborMainSub,
              stonesCountTotal,
              goldWeightG: item.gold_weight || 0,
              stonesWeightTotal
            });
          } catch (itemErr) {
            console.error("ReleaseList item mapping error:", itemErr, item);
          }
        });
      } catch (orderErr) {
        console.error("ReleaseList order status check error:", orderErr, order);
      }
    });

    return items;
  }, [orders, catalog, stones]);

  const totalPages = Math.ceil(releaseItems.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedReleaseItems = releaseItems.slice(startIndex, startIndex + pageSize);

  // 체크박스 제어
  const isAllChecked = paginatedReleaseItems.length > 0 && paginatedReleaseItems.every(r => checkedItems.has(r.id));

  const handleToggleAll = () => {
    if (isAllChecked) {
      const next = new Set(checkedItems);
      paginatedReleaseItems.forEach(r => next.delete(r.id));
      setCheckedItems(next);
    } else {
      const next = new Set(checkedItems);
      paginatedReleaseItems.forEach(r => next.add(r.id));
      setCheckedItems(next);
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(checkedItems);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setCheckedItems(next);
  };

  // 일괄 출고 완료
  const handleCompleteRelease = async () => {
    try {
      if (checkedItems.size === 0) {
        alert('출고 처리할 품목을 선택해주세요.');
        return;
      }

      const updates: { orderId: string, itemId: number }[] = [];
      checkedItems.forEach(rowId => {
        if (rowId.startsWith('release-item::')) {
          const parts = rowId.split('::');
          const orderId = parts[1];
          const itemId = Number(parts[2]);
          if (orderId && !isNaN(itemId)) {
            updates.push({ orderId, itemId });
          }
        }
      });

      if (updates.length === 0) {
        alert('선택한 품목 정보를 찾지 못했습니다.');
        return;
      }

      const isConfirm = window.confirm(`선택한 ${updates.length}개 품목을 '출고 완료' 상태로 변경하시겠습니까?`);
      if (!isConfirm) return;

      await updateMultipleItemsStatus(updates, '출고완료');
      alert('선택한 품목들이 최종 출고 완료 처리되었습니다.');
      setCheckedItems(new Set());
      fetchDb();

      // 미수 대장 탭으로 화면 전환
      setTimeout(() => {
        setActiveTab('unpaid_ledger');
      }, 50);
    } catch (err: any) {
      alert(`[출고 완료 처리 오류]\n상태 변경 중 에러가 발생했습니다:\n${err.message || err}`);
      console.error("handleCompleteRelease error:", err);
    }
  };

  const handleOpenDetailWindow = (modelNumber: string) => {
    const w = 860;
    const h = 900;
    const left = window.screen.width / 2 - w / 2;
    const top = window.screen.height / 2 - h / 2;
    
    window.open(
      `./?popup=catalog_detail&model=${encodeURIComponent(modelNumber)}`, 
      `catalog_detail_popup_${modelNumber.replace(/[^a-zA-Z0-9가-힣]/g, '_')}`, 
      `width=${w},height=${h},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );
  };

  // 개별 세공작업 되돌리기
  const handleRevertToWork = async (orderId: string, itemId: number) => {
    try {
      const isConfirm = window.confirm("선택하신 품목을 '세공 작업(공장발주)' 상태로 되돌리시겠습니까?\n되돌린 후 주얼리 세공리스트로 자동 이동합니다.");
      if (!isConfirm) return;

      await updateMultipleItemsStatus([{ orderId, itemId }], '공장발주');
      alert('세공 작업 상태로 복구되었습니다.');
      fetchDb();

      // 주얼리 세공리스트 탭으로 화면 전환
      setTimeout(() => {
        setActiveTab('work_list');
      }, 50);
    } catch (err: any) {
      alert(`[되돌리기 오류]\n에러가 발생했습니다:\n${err.message || err}`);
      console.error("handleRevertToWork error:", err);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <h2 style={{ fontSize: '19px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={18} style={{ color: 'var(--primary)' }} />
          <span className="gradient-text" style={{ fontFamily: 'var(--font-title)', fontWeight: '600' }}>출고 대기</span>
          <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>(주얼리 세공완료 출고 대기 대장)</span>
        </h2>
      </div>

      {/* Batch Action Buttons */}
      <div className="ledger-action-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15,23,42,0.02)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleCompleteRelease}
            disabled={checkedItems.size === 0}
            className="btn-primary"
            style={{
              padding: '6px 16px',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: checkedItems.size > 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#e2e8f0',
              color: checkedItems.size > 0 ? '#fff' : '#475569',
              border: checkedItems.size > 0 ? 'none' : '1.5px solid #94a3b8',
              fontWeight: 'bold',
              borderRadius: '4px',
              cursor: checkedItems.size > 0 ? 'pointer' : 'not-allowed',
              boxShadow: 'none'
            }}
          >
            <CheckCircle size={14} /> 선택 품목 출고 완료 처리 (장부 확정)
          </button>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '8px' }}>
            *출고 완료 처리 시 매출 장부로 이동합니다.
          </span>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          선택된 항목 수: <strong style={{ color: 'var(--primary)' }}>{checkedItems.size}</strong>개
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="table-responsive" style={{ overflowX: 'auto' }}>
        <table className="excel-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1350px', fontSize: '14px', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '3%' }} />
            <col style={{ width: '3%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '3%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '5%' }} />
          </colgroup>
          <thead>
            <tr style={{ background: 'rgba(15, 23, 42, 0.03)', borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)' }}>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <input 
                  type="checkbox" 
                  checked={isAllChecked} 
                  onChange={handleToggleAll} 
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>No</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>의뢰일</th>
              <th style={{ padding: '8px 4px', border: '1px solid var(--border-color)' }}>거래처</th>
              <th style={{ padding: '8px 4px', border: '1px solid var(--border-color)' }}>모델</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>재질</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>색상</th>
              <th style={{ padding: '8px 4px', border: '1px solid var(--border-color)' }}>비고</th>
              <th style={{ padding: '8px 4px', textAlign: 'right', border: '1px solid var(--border-color)' }}>중량(금)</th>
              <th style={{ padding: '8px 4px', textAlign: 'right', border: '1px solid var(--border-color)' }}>중량(스톤)</th>
              <th style={{ padding: '8px 4px', textAlign: 'right', border: '1px solid var(--border-color)' }}>구매단가</th>
              <th style={{ padding: '8px 4px', textAlign: 'right', border: '1px solid var(--border-color)' }}>공임단가(기본+추가)</th>
              <th style={{ padding: '8px 4px', textAlign: 'right', border: '1px solid var(--border-color)' }}>공임단가(중심+보조)</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>알수</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>수량</th>
              <th style={{ padding: '8px 4px', textAlign: 'right', border: '1px solid var(--border-color)' }}>합계</th>
              <th style={{ padding: '8px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>되돌리기</th>
            </tr>
          </thead>
          <tbody>
            {paginatedReleaseItems.length > 0 ? (
              paginatedReleaseItems.map((row, idx) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(15, 23, 42, 0.01)' }}>
                  <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <input type="checkbox" checked={checkedItems.has(row.id)} onChange={() => handleToggleRow(row.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={{ padding: '6px 4px', textAlign: 'center', color: 'var(--text-muted)', verticalAlign: 'middle' }}>{idx + 1}</td>
                  <td style={{ padding: '6px 4px', textAlign: 'center', color: 'var(--text-muted)', verticalAlign: 'middle' }}>
                    {(() => {
                      try {
                        const d = new Date(row.orderDate);
                        return isNaN(d.getTime()) ? '-' : d.toISOString().slice(5, 10);
                      } catch {
                        return '-';
                      }
                    })()}
                  </td>
                  <td 
                    style={{ padding: '6px 4px', verticalAlign: 'middle', fontWeight: 'bold', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => handleOpenInvoiceModal(row.customerId, row.customerName)}
                    title="거래처별 명세서 발행 팝업 열기"
                  >
                    {row.customerName}
                  </td>
                  <td 
                    style={{ padding: '6px 4px', verticalAlign: 'middle', fontWeight: '700', color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => handleOpenDetailWindow(row.model)}
                  >
                    {row.model}
                  </td>
                  <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>{row.material}</td>
                  <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>{row.color}</td>
                  <td 
                    style={{ padding: '6px 4px', textAlign: 'center', color: '#fbbf24', fontWeight: 'bold', cursor: row.note ? 'pointer' : 'default', textDecoration: row.note ? 'underline' : 'none', verticalAlign: 'middle' }}
                    onClick={() => row.note && alert(`[거래 비고]\n${row.note}`)}
                  >
                    {row.note ? '※' : ''}
                  </td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 'bold' }}>{row.goldWeightG > 0 ? `${row.goldWeightG.toFixed(2)}g` : '-'}</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', verticalAlign: 'middle', color: 'var(--text-muted)' }}>{row.stonesWeightTotal > 0 ? `${row.stonesWeightTotal.toFixed(3)}g` : '-'}</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 'bold', color: '#10b981' }}>{row.buyPrice.toLocaleString()}원</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', verticalAlign: 'middle', color: 'var(--text-main)' }}>{row.laborBaseExtra.toLocaleString()}원</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', verticalAlign: 'middle', color: 'var(--text-main)' }}>{row.laborMainSub.toLocaleString()}원</td>
                  <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>{row.stonesCountTotal}알</td>
                  <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle', fontSize: '15px' }}>{row.quantity}</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: '700', verticalAlign: 'middle' }}>{row.totalAmount.toLocaleString()}원</td>
                  <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <button type="button" onClick={() => handleRevertToWork(row.orderId, row.itemId)} style={{ padding: '4px 8px', fontSize: '13px', background: 'rgba(245, 158, 11, 0.1)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '4px', cursor: 'pointer' }}>되돌리기</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={17} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '15px' }}>
                  현재 출고 대기 중인 세공완료 품목이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button
              disabled={currentPage === 1}
              onClick={() => {
                setCurrentPage(prev => Math.max(1, prev - 1));
              }}
              className="btn-primary"
              style={{
                padding: '5px 12px',
                fontSize: '13px',
                background: currentPage === 1 ? 'rgba(0,0,0,0.02)' : 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)',
                color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-inverse)',
                border: currentPage === 1 ? '1px solid var(--border-color)' : 'none',
                boxShadow: currentPage === 1 ? 'none' : '0 2px 6px rgba(37, 99, 235, 0.15)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              이전
            </button>
            
            {(() => {
              const pageNumbers = [];
              let startPage = Math.max(1, currentPage - 2);
              let endPage = Math.min(totalPages, startPage + 4);
              if (endPage - startPage < 4) {
                startPage = Math.max(1, endPage - 4);
              }
              for (let i = startPage; i <= endPage; i++) {
                pageNumbers.push(i);
              }
              return pageNumbers.map(page => {
                const isActive = page === currentPage;
                return (
                  <button
                    key={page}
                    onClick={() => {
                      setCurrentPage(page);
                    }}
                    className="btn-primary"
                    style={{
                      padding: '5px 12px',
                      fontSize: '13px',
                      minWidth: '32px',
                      background: isActive ? 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)' : 'transparent',
                      color: isActive ? 'var(--text-inverse)' : 'var(--text-muted)',
                      border: isActive ? 'none' : '1px solid var(--border-color)',
                      boxShadow: isActive ? '0 2px 6px rgba(37, 99, 235, 0.15)' : 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {page}
                  </button>
                );
              });
            })()}

            <button
              disabled={currentPage === totalPages}
              onClick={() => {
                setCurrentPage(prev => Math.min(totalPages, prev + 1));
              }}
              className="btn-primary"
              style={{
                padding: '5px 12px',
                fontSize: '13px',
                background: currentPage === totalPages ? 'rgba(0,0,0,0.02)' : 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)',
                color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-inverse)',
                border: currentPage === totalPages ? '1px solid var(--border-color)' : 'none',
                boxShadow: currentPage === totalPages ? 'none' : '0 2px 6px rgba(37, 99, 235, 0.15)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 거래처별 출고대기 명세서 선택 출력 모달 */}
      {activeInvoiceModalCustomer && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border-color)',
            width: '680px',
            maxWidth: '100%',
            maxHeight: '90%',
            overflowY: 'auto',
            borderRadius: '8px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)'
          }}>
            {/* 헤더 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Package size={16} style={{ color: 'var(--primary)' }} />
                <span>[{activeInvoiceModalCustomer.customerName}] 출고 대기 명세서 발행</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setActiveInvoiceModalCustomer(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* 테이블 안내 */}
            <div style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
              출명세서에 포함할 품목을 선택해 주세요.
            </div>

            {/* 품목 리스트 테이블 */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.02)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={!!isAllInvoiceChecked} 
                        onChange={handleToggleAllInvoice} 
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ padding: '8px 10px' }}>모델명</th>
                    <th style={{ padding: '8px 10px', width: '100px', textAlign: 'center' }}>재질/색상</th>
                    <th style={{ padding: '8px 10px', width: '60px', textAlign: 'center' }}>수량</th>
                    <th style={{ padding: '8px 10px', width: '120px', textAlign: 'right' }}>공임비합계</th>
                  </tr>
                </thead>
                <tbody>
                  {activeInvoiceModalCustomer.items.map((item) => {
                    const laborSum = item.laborSingle * item.quantity;
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid rgba(15,23,42,0.05)' }}>
                        <td style={{ padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <input 
                            type="checkbox" 
                            checked={invoiceCheckedItems.has(item.id)} 
                            onChange={() => handleToggleInvoiceRow(item.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#38bdf8' }}>{item.model}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center' }}>{item.material} / {item.color}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>
                          {laborSum.toLocaleString()}원
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 하단 버튼 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
              <button 
                type="button" 
                onClick={() => setActiveInvoiceModalCustomer(null)} 
                className="btn-primary" 
                style={{ padding: '6px 14px', background: 'rgba(15,23,42,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border-color)', boxShadow: 'none' }}
              >
                닫기
              </button>
              <button 
                type="button" 
                onClick={handlePrintInvoice} 
                className="btn-primary" 
                style={{ padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={14} /> 거래명세서 출력
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
