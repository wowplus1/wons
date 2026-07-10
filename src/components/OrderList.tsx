// src/components/OrderList.tsx
import React, { useState } from 'react';
import { useErpStore } from '../store/useErpStore';
import { ShoppingBag } from 'lucide-react';
import { CatalogImage } from './CatalogImage';

interface RowData {
  id: string;
  date: string;
  dateDisplay: string;
  type: '판매' | '결제' | '반품' | 'DC';
  customerName: string;
  customerId: string;
  orderId?: string;
  itemId?: number;
  transactionId?: string;
  serialNo?: string;
  tradeNo: string;
  model: string;
  material: string;
  color?: string;
  note: string;
  weightGoldDon: number;
  weightPureGoldDon: number;
  purchasePrice?: number;
  laborBaseExtra?: number;
  laborStone?: number;
  stoneQty?: number;
  quantity: number;
  totalAmount?: number;
  vat?: string;
  stoneMainName: string;
  stoneSubName: string;
  size: string;
  manufacturer: string;
  status?: string;          // 공정 단계 (접수/공장발주/출고대기/출고완료/보류/결제)
  releaseDate?: string;     // 출고일 (품목 release_date)
  releaseDisplay?: string;  // 출고일 MM-DD 표시
}

// 공정 단계별 배지 색상
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  '접수':     { bg: 'rgba(148, 163, 184, 0.18)', color: '#64748b', label: '접수' },
  '공장발주': { bg: 'rgba(245, 158, 11, 0.18)',  color: '#d97706', label: '공장발주' },
  '출고대기': { bg: 'rgba(167, 139, 250, 0.18)', color: '#7c3aed', label: '출고대기' },
  '출고완료': { bg: 'rgba(52, 211, 153, 0.18)',  color: '#059669', label: '출고완료' },
  '보류':     { bg: 'rgba(239, 68, 68, 0.15)',   color: '#dc2626', label: '보류' },
  '결제':     { bg: 'rgba(56, 189, 248, 0.15)',  color: '#0284c7', label: '결제' },
};

export const OrderList: React.FC = () => {
  const { catalog, orders, customers, transactions, updateMultipleItemsStatus, setActiveTab, deleteOrder, deleteOrderItem, deleteTransaction, startEditOrder } = useErpStore();
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterType, setFilterType] = useState<'전체' | '판매' | '결제' | '반품' | 'DC'>('전체');
  const [filterStatus, setFilterStatus] = useState<'전체' | '접수' | '공장발주' | '출고대기' | '출고완료' | '보류'>('접수');
  const [filterText, setFilterText] = useState('');   // 통합 검색 (모델/비고/제조사)
  const [sortKey, setSortKey] = useState<'접수일' | '출고일' | '거래처' | '모델' | '재질' | '단계'>('접수일');
  const [checkedRows, setCheckedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;
  // 페이지 번호 이동 시 콘텐츠 상단으로 스크롤
  React.useEffect(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 0; }, [currentPage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterCustomer, filterType, filterStatus, filterText, sortKey]);

  const handleDeleteRow = (row: RowData) => {
    const isConfirm = window.confirm(`선택한 [${row.type}] 데이터를 완전히 삭제하시겠습니까?\n삭제된 정보는 즉시 거래처의 미수금 및 순금 미수량에서 복구(역산)처리 됩니다.`);
    if (!isConfirm) return;

    if (row.orderId && row.itemId !== undefined) {
      deleteOrderItem(row.orderId, row.itemId);
      alert('선택하신 개별 품목 데이터가 완전히 삭제되었습니다.');
    } else if (row.orderId) {
      deleteOrder(row.orderId);
      alert('해당 주문서 데이터가 완전히 삭제되었습니다.');
    } else if (row.transactionId) {
      deleteTransaction(row.transactionId);
      alert('해당 수동결제 데이터가 완전히 삭제되었습니다.');
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

  // Compile all rows (Orders + Gold Payments)
  // 거래처별 거래(주문서 및 수동 결제) 횟수를 순차적으로 매기기 위한 맵 계산
  const allRows = React.useMemo(() => {
    const customerEvents: { [customerId: string]: { id: string; date: string }[] } = {};

    // 1) 주문서(Order) 추가 (동일 주문서 안의 아이템들은 하나의 거래 이벤트)
    orders.forEach(order => {
      const cId = order.customer_snapshot?.customer_id;
      if (!cId) return;
      if (!customerEvents[cId]) {
        customerEvents[cId] = [];
      }
      // 동일한 주문서 ID가 이미 들어가 있는지 확인하여 중복 방지
      if (!customerEvents[cId].some(e => e.id === order.order_id)) {
        customerEvents[cId].push({
          id: order.order_id,
          date: order.order_date
        });
      }
    });

    // 2) 수동으로 입력한 결제(Transaction) 추가 (system 생성 제외)
    transactions.forEach(tx => {
      if (tx.created_by === 'system') return;
      const cId = tx.customer_id;
      if (!cId) return;
      if (!customerEvents[cId]) {
        customerEvents[cId] = [];
      }
      if (!customerEvents[cId].some(e => e.id === tx.transaction_id)) {
        customerEvents[cId].push({
          id: tx.transaction_id,
          date: tx.created_at
        });
      }
    });

    // 3) 거래처별로 시간순(date 오름차순) 정렬 후 거래No (1부터 차례대로) 부여
    const tradeNoMap: { [customerId: string]: { [eventId: string]: number } } = {};
    Object.keys(customerEvents).forEach(cId => {
      const sorted = [...customerEvents[cId]].sort((a, b) => a.date.localeCompare(b.date));
      tradeNoMap[cId] = {};
      sorted.forEach((event, index) => {
        tradeNoMap[cId][event.id] = index + 1;
      });
    });

    const rows: RowData[] = [];

    // 1. Map order items to sales rows
    orders.forEach(order => {
      if (!order) return;

      const cId = order.customer_snapshot?.customer_id;
      const customer = cId ? customers.find(c => c.customer_id === cId) : undefined;
      const lossRate = order.customer_snapshot?.loss_rate || customer?.loss_rate || 0;

      const itemsList = order.items || [];
      itemsList.forEach((item, itemIdx) => {
        // 품목별 상태 체크 (구버전 데이터 대응 포함) — 통합 현황: 전 단계 표시
        const itemStatus = item.status || order.status || '접수';
        const qty = item.quantity || 1;
        const pureGoldWeightG = item.estimated_weight_g || 0;
        const weightGoldDon = pureGoldWeightG / 3.75;

        const purity = item.material === '14K' ? 0.585 : item.material === '18K' ? 0.750 : 1.0;
        const singleGoldSalesDon = Math.floor((weightGoldDon * purity * (1 + lossRate / 100)) * 1000) / 1000;
        const weightPureGoldDon = singleGoldSalesDon * qty;

        const baseLabor = item.labor_base || 0;
        const extraLabor = item.labor_extra || 0;

        const mainStoneLabor = (item.labor_main || 0) * (item.qty_main || 0);
        const subStoneLabor = (item.labor_sub || 0) * (item.qty_sub || 0);

        const laborBaseExtra = baseLabor + extraLabor;
        const laborStone = mainStoneLabor + subStoneLabor;
        const totalAmount = (laborBaseExtra + laborStone) * qty;

        const serialNo = order.order_id.replace(/[^0-9]/g, '').slice(-8) || order.order_id.slice(-8);
        
        // 거래처별 계산된 누적 거래No 가져오기
        const tradeNoVal = cId ? (tradeNoMap[cId]?.[order.order_id] || 1) : 1;
        const tradeNo = String(tradeNoVal);

        // Map models to match the specific costs in the user image
        let purchasePrice = 20000;
        if (item.model_number === '650M-런블') purchasePrice = 97400;
        else if (item.model_number === '벨R-562') purchasePrice = 22000;
        else if (item.model_number === '벨M-549') purchasePrice = 150800;
        else if (item.model_number.includes('JP출력')) purchasePrice = 20000;

        rows.push({
          id: `order-item::${order.order_id}::${item.item_id}::${itemIdx}`,
          date: order.order_date,
          dateDisplay: (() => {
            try {
              const d = new Date(order.order_date);
              return isNaN(d.getTime()) ? '-' : d.toISOString().slice(5, 10);
            } catch {
              return '-';
            }
          })(),
          type: item.division || '판매',
          customerName: order.customer_snapshot?.name || '알수없음',
          customerId: cId || '',
          orderId: order.order_id,
          itemId: item.item_id,
          serialNo,
          tradeNo,
          model: item.model_number,
          material: item.material,
          color: item.color,
          note: item.note || '',
          weightGoldDon,
          weightPureGoldDon,
          purchasePrice,
          laborBaseExtra,
          laborStone,
          stoneQty: item.qty_main || undefined,
          quantity: qty,
          totalAmount,
          stoneMainName: item.stone_main_name || '',
          stoneSubName: item.stone_sub_name || '',
          size: item.size || '',
          manufacturer: item.manufacturer || '',
          status: itemStatus,
          releaseDate: item.release_date || '',
          releaseDisplay: (() => {
            if (!item.release_date) return '';
            try {
              const d = new Date(item.release_date);
              return isNaN(d.getTime()) ? '' : d.toISOString().slice(5, 10);
            } catch {
              return '';
            }
          })(),
        });
      });
    });

    // 2. Map gold transactions to payment rows (Exclude system generated transactions to avoid duplication)
    transactions.forEach((tx, txIdx) => {
      if (tx.created_by === 'system') return;

      const customer = customers.find(c => c.customer_id === tx.customer_id);
      const dateDisplay = new Date(tx.created_at).toISOString().slice(5, 10); // MM-DD

      const weightGoldDon = tx.weight_g / 3.75;
      const purity = tx.gold_type === '14K' ? 0.585 : tx.gold_type === '18K' ? 0.750 : 1.0;
      const weightPureGoldDon = weightGoldDon * purity;

      // 거래처별 계산된 누적 거래No 가져오기
      const tradeNoVal = tradeNoMap[tx.customer_id]?.[tx.transaction_id] || 1;
      const tradeNo = String(tradeNoVal);

      rows.push({
        id: `tx-${tx.transaction_id}-${txIdx}`,
        date: tx.created_at,
        dateDisplay,
        type: '결제',
        customerName: customer?.name || '알수없음',
        customerId: tx.customer_id,
        transactionId: tx.transaction_id,
        tradeNo,
        model: '결제',
        material: tx.gold_type || '24K',
        note: tx.note || '',
        weightGoldDon,
        weightPureGoldDon,
        quantity: 1,
        stoneMainName: '',
        stoneSubName: '',
        size: '',
        manufacturer: '',
        status: '결제',
        releaseDate: '',
        releaseDisplay: '',
      });
    });

    return rows;
  }, [orders, transactions, customers]);

  // Filter & Search + Sort Logic
  const filteredRows = React.useMemo(() => {
    const text = filterText.trim().toLowerCase();
    const filtered = allRows.filter(row => {
      const matchCustomer = row.customerName.toLowerCase().includes(filterCustomer.toLowerCase());
      const matchType = filterType === '전체' || row.type === filterType;
      const matchStatus = filterStatus === '전체' || (row.status || '접수') === filterStatus;
      const matchText = !text ||
        row.model.toLowerCase().includes(text) ||
        (row.note || '').toLowerCase().includes(text) ||
        (row.manufacturer || '').toLowerCase().includes(text);
      return matchCustomer && matchType && matchStatus && matchText;
    });

    // 정렬 (선택 키 기준, 동률/미지정 시 접수일 최신순)
    const byDateDesc = (a: RowData, b: RowData) => (b.date || '').localeCompare(a.date || '');
    filtered.sort((a, b) => {
      switch (sortKey) {
        case '출고일': {
          // 출고일 있는 항목 우선, 최신순. 없으면 뒤로.
          const ra = a.releaseDate || '';
          const rb = b.releaseDate || '';
          if (!ra && !rb) return byDateDesc(a, b);
          if (!ra) return 1;
          if (!rb) return -1;
          return rb.localeCompare(ra);
        }
        case '거래처': {
          const c = a.customerName.localeCompare(b.customerName, 'ko');
          return c !== 0 ? c : byDateDesc(a, b);
        }
        case '모델': {
          const c = a.model.localeCompare(b.model, 'ko');
          return c !== 0 ? c : byDateDesc(a, b);
        }
        case '재질': {
          const c = (a.material || '').localeCompare(b.material || '', 'ko');
          return c !== 0 ? c : byDateDesc(a, b);
        }
        case '단계': {
          const order = ['접수', '공장발주', '출고대기', '출고완료', '보류', '결제'];
          const c = order.indexOf(a.status || '접수') - order.indexOf(b.status || '접수');
          return c !== 0 ? c : byDateDesc(a, b);
        }
        case '접수일':
        default:
          return byDateDesc(a, b);
      }
    });
    return filtered;
  }, [allRows, filterCustomer, filterType, filterStatus, filterText, sortKey]);

  const totalPages = Math.ceil(filteredRows.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + pageSize);

  // 체크박스 제어 로직
  const selectableRows = paginatedRows;
  const isAllChecked = selectableRows.length > 0 && selectableRows.every(r => checkedRows.has(r.id));

  const handleToggleAll = () => {
    if (isAllChecked) {
      const next = new Set(checkedRows);
      selectableRows.forEach(r => next.delete(r.id));
      setCheckedRows(next);
    } else {
      const next = new Set(checkedRows);
      selectableRows.forEach(r => next.add(r.id));
      setCheckedRows(next);
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(checkedRows);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setCheckedRows(next);
  };

  const handleSendToWorkList = async () => {
    try {
      if (checkedRows.size === 0) {
        alert('보내기 처리할 항목을 선택해주세요.');
        return;
      }

      // 선택된 행들로부터 orderId와 itemId 리스트 추출
      const updates: { orderId: string, itemId: number }[] = [];
      checkedRows.forEach(rowId => {
        if (rowId.startsWith('order-item::')) {
          const parts = rowId.split('::');
          const orderId = parts[1];
          const itemId = parseInt(parts[2]);
          if (orderId && !isNaN(itemId)) {
            updates.push({ orderId, itemId });
          }
        }
      });

      if (updates.length === 0) {
        alert('선택한 항목에서 품목 정보를 찾을 수 없습니다.');
        return;
      }

      // 품목별 성격에 따라 세공 대상(판매, 반품)과 정산 대상(결제, DC) 분류
      const craftUpdates: typeof updates = [];
      const releaseUpdates: typeof updates = [];

      let skippedNotReceived = 0;
      updates.forEach(up => {
        const orderObj = orders.find(o => o.order_id === up.orderId);
        if (orderObj) {
          const item = orderObj.items.find(i => i.item_id === up.itemId);
          if (item) {
            // 통합 현황에서 전 단계가 함께 보이므로, '접수' 단계 품목만 발주 대상으로 처리
            const curStatus = item.status || orderObj.status || '접수';
            if (curStatus !== '접수') {
              skippedNotReceived++;
              return;
            }
            const isCraft = item.division === '판매' || item.division === '반품';
            if (isCraft) {
              craftUpdates.push(up);
            } else {
              releaseUpdates.push(up);
            }
          }
        }
      });

      if (craftUpdates.length === 0 && releaseUpdates.length === 0) {
        alert(`전송 대상이 없습니다.\n이미 발주/출고 단계로 넘어간 품목은 이 버튼으로 이동할 수 없습니다.\n('접수' 단계 품목만 발주 대상)`);
        return;
      }

      // 사용자 확인 및 피드백 메시지 구성
      let confirmMessage = `선택한 ${updates.length}개 품목을 전송하시겠습니까?`;
      if (craftUpdates.length > 0 && releaseUpdates.length > 0) {
        confirmMessage = `선택한 품목 중 세공이 필요한 제품 ${craftUpdates.length}개는 [세공 작업]으로 보내고,\n결제/DC 정산 품목 ${releaseUpdates.length}개는 세공 없이 바로 [출고 대기]로 보냅니다. 진행하시겠습니까?`;
      } else if (releaseUpdates.length > 0) {
        confirmMessage = `선택한 품목 ${releaseUpdates.length}개는 결제/DC로만 구성되어 있어 세공 없이 바로 [출고 대기]로 보냅니다. 진행하시겠습니까?`;
      }

      const isConfirm = window.confirm(confirmMessage);
      if (!isConfirm) return;

      // 상태 업데이트 실행
      if (craftUpdates.length > 0) {
        await updateMultipleItemsStatus(craftUpdates, '공장발주');
      }
      if (releaseUpdates.length > 0) {
        await updateMultipleItemsStatus(releaseUpdates, '출고대기');
      }

      alert(`선택한 품목들의 전송이 완료되었습니다.\n\n- 세공 작업(공장발주) 이동: ${craftUpdates.length}개\n- 출고 대기 이동 (결제/DC 전용): ${releaseUpdates.length}개${skippedNotReceived > 0 ? `\n- 제외됨(이미 발주/출고 단계): ${skippedNotReceived}개` : ''}`);
      
      // 선택 상태 비우기
      setCheckedRows(new Set());
      
      // 상태 전파가 완료된 후 적절한 탭으로 화면 전환
      setTimeout(() => {
        if (craftUpdates.length > 0) {
          setActiveTab('work_list');
        } else {
          setActiveTab('release_list');
        }
      }, 50);
    } catch (err: any) {
      alert(`[오류 발생]\n처리 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요.\n문제가 계속되면 관리자에게 문의해주세요.\n(오류코드: ${err.message || err})`);
      console.error("handleSendToWorkList error:", err);
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15px' }}>
      
      {/* Header */}
      <div className="order-list-header">
        <h2 style={{ fontSize: '19px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShoppingBag size={18} style={{ color: 'var(--primary)' }} />
          <span className="gradient-text" style={{ fontFamily: 'var(--font-title)', fontWeight: '600' }}>주문/명세서</span>
          <span className="header-subtitle">(거래처 원장 명세서 원본 관리 대장)</span>
        </h2>
      </div>

      {/* Filter Options */}
      <div className="order-list-filter-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: 'rgba(15,23,42,0.01)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '14px' }}>거래처 검색:</label>
          <input
            type="text"
            placeholder="거래처명 입력..."
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            className="input-field"
            style={{ padding: '5px 10px', fontSize: '15px', width: '180px', height: '32px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '14px' }}>구분 필터:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as '전체' | '판매' | '결제' | '반품' | 'DC')}
            className="input-field"
            style={{ padding: '0 8px', fontSize: '15px', width: '120px', height: '32px' }}
          >
            <option value="전체">전체 구분</option>
            <option value="판매">판매 (주문)</option>
            <option value="결제">결제 (정산)</option>
            <option value="반품">반품</option>
            <option value="DC">DC</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '14px' }}>단계:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="input-field"
            style={{ padding: '0 8px', fontSize: '15px', width: '120px', height: '32px' }}
          >
            <option value="전체">전체 단계</option>
            <option value="접수">접수</option>
            <option value="공장발주">공장발주</option>
            <option value="출고대기">출고대기</option>
            <option value="출고완료">출고완료</option>
            <option value="보류">보류</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '14px' }}>검색:</label>
          <input
            type="text"
            placeholder="모델 / 비고 / 제조사..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="input-field"
            style={{ padding: '5px 10px', fontSize: '15px', width: '170px', height: '32px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontWeight: '700', color: 'var(--text-muted)', fontSize: '14px' }}>정렬:</label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
            className="input-field"
            style={{ padding: '0 8px', fontSize: '15px', width: '110px', height: '32px' }}
          >
            <option value="접수일">접수일순</option>
            <option value="출고일">출고일순</option>
            <option value="거래처">거래처순</option>
            <option value="모델">모델순</option>
            <option value="재질">재질순</option>
            <option value="단계">단계순</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '14px', color: 'var(--text-muted)' }}>
          조회 결과: <strong style={{ color: 'var(--primary)' }}>{filteredRows.length}</strong>건
        </div>
      </div>

      {/* Batch Action Buttons */}
      <div className="ledger-action-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15,23,42,0.02)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSendToWorkList}
            disabled={checkedRows.size === 0}
            className="btn-primary"
            style={{
              padding: '6px 16px',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: checkedRows.size > 0 ? 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)' : '#e2e8f0',
              color: checkedRows.size > 0 ? 'var(--text-inverse)' : '#475569',
              border: checkedRows.size > 0 ? 'none' : '1.5px solid #94a3b8',
              fontWeight: 'bold',
              borderRadius: '4px',
              cursor: checkedRows.size > 0 ? 'pointer' : 'not-allowed',
              boxShadow: 'none'
            }}
          >
            선택 품목 세공리스트로 보내기 (발주 처리)
          </button>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          선택된 항목 수: <strong style={{ color: 'var(--primary)' }}>{checkedRows.size}</strong>개
        </div>
      </div>

      {/* Table grid */}
      <div className="table-responsive" style={{ overflowX: 'auto' }}>
        <table className="excel-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px', fontSize: '14px', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '4%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '6%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '5%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '4%' }} />
            <col style={{ width: '5%' }} />
          </colgroup>
          <thead>
            <tr style={{ background: 'rgba(15, 23, 42, 0.03)', borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', height: '40px' }}>
              <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <input 
                  type="checkbox" 
                  checked={isAllChecked} 
                  onChange={handleToggleAll} 
                  style={{ cursor: 'pointer' }}
                  title="전체 가공 품목 선택/해제"
                />
              </th>
              <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>접수/출고일</th>
              <th style={{ padding: '6px 4px', border: '1px solid var(--border-color)' }}>거래처</th>
              <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>단계</th>
              <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>사진</th>
              <th style={{ padding: '6px 4px', border: '1px solid var(--border-color)' }}>모델</th>
              <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>재질</th>
              <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>색상</th>
              <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>중심</th>
              <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>보조</th>
              <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>사이즈</th>
              <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>수량</th>
              <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)', color: 'var(--primary)' }}>공임합계</th>
              <th style={{ padding: '6px 4px', border: '1px solid var(--border-color)' }}>비고</th>
              <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>수정</th>
              <th style={{ padding: '6px 4px', textAlign: 'center', border: '1px solid var(--border-color)' }}>삭제</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, idx) => {
                // 구분(type)별 텍스트 색상
                const getDivisionColor = (type: string) => {
                  switch (type) {
                    case '판매': return '#38bdf8'; // 하늘색
                    case '결제': return '#34d399'; // 초록색
                    case '반품': return '#fb7185'; // 분홍색
                    case 'DC': return '#a78bfa';   // 보라색
                    default: return '#38bdf8';
                  }
                };

                return (
                  <tr 
                    key={row.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(15, 23, 42, 0.01)',
                      height: '48px'
                    }}
                  >
                    {/* 체크박스 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={checkedRows.has(row.id)}
                        onChange={() => handleToggleRow(row.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>

                    {/* 접수/출고일 (2줄) */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', color: 'var(--text-muted)', lineHeight: '1.3', fontSize: '13px' }}>
                      <div title="접수일"><span style={{ color: '#94a3b8' }}>접</span> {row.dateDisplay}</div>
                      <div title="출고일" style={{ color: row.releaseDisplay ? '#059669' : 'var(--text-muted)' }}>
                        <span style={{ color: '#94a3b8' }}>출</span> {row.releaseDisplay || '-'}
                      </div>
                    </td>

                    {/* 거래처 */}
                    <td style={{ padding: '6px 4px', fontWeight: '600' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--text-main)' }}>
                        {row.customerName}
                        <span style={{ color: getDivisionColor(row.type), fontSize: '12px' }} title={row.type}>
                          {row.type === '판매' ? '●' : row.type === '결제' ? '■' : row.type === '반품' ? '▲' : '◆'}
                        </span>
                      </span>
                    </td>

                    {/* 단계 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                      {(() => {
                        const st = row.status || '접수';
                        const s = STATUS_STYLE[st] || STATUS_STYLE['접수'];
                        return (
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 7px',
                            borderRadius: '10px',
                            background: s.bg,
                            color: s.color,
                            fontSize: '12px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}>
                            {s.label}
                          </span>
                        );
                      })()}
                    </td>

                    {/* 사진 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                      {(() => {
                        const matched = catalog.find(c => c.model_number.toUpperCase() === row.model.toUpperCase());
                        if (!matched) return <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>-</span>;
                        return (
                          <CatalogImage
                            model={matched.model_number}
                            embeddedImages={matched.images}
                            hasImage={matched.has_image}
                            alt={row.model}
                            imgStyle={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                            fallback={<span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>-</span>}
                          />
                        );
                      })()}
                    </td>

                    {/* 모델 */}
                    <td 
                      style={{ 
                        padding: '6px 4px', 
                        fontWeight: '700', 
                        color: row.model && row.model !== '결제' ? '#38bdf8' : 'var(--text-main)',
                        textDecoration: row.model && row.model !== '결제' ? 'underline' : 'none',
                        cursor: row.model && row.model !== '결제' ? 'pointer' : 'default'
                      }}
                      onClick={() => {
                        if (row.model && row.model !== '결제') {
                          handleOpenDetailWindow(row.model);
                        }
                      }}
                    >
                      {row.model}
                    </td>

                    {/* 재질 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold' }}>{row.material}</td>

                    {/* 색상 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>{row.color || ''}</td>

                    {/* 중심 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>{row.stoneMainName || '-'}</td>

                    {/* 보조 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>{row.stoneSubName || '-'}</td>

                    {/* 사이즈 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>{row.size || '-'}</td>

                    {/* 수량 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center', fontWeight: 'bold' }}>{row.quantity}</td>

                    {/* 공임합계 */}
                    <td style={{ padding: '6px 4px', textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>
                      {row.totalAmount !== undefined ? `${row.totalAmount.toLocaleString()}원` : '-'}
                    </td>

                    {/* 비고 */}
                    <td 
                      style={{ 
                        padding: '6px 4px', 
                        color: 'var(--text-muted)', 
                        fontSize: '13px', 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        cursor: row.note ? 'pointer' : 'default',
                        textDecoration: row.note ? 'underline' : 'none'
                      }}
                      title={row.note}
                      onClick={() => row.note && alert(`[거래 메모]\n${row.note}`)}
                    >
                      {row.note || '-'}
                    </td>



                    {/* 수정 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                      {row.orderId ? (
                        <button
                          type="button"
                          onClick={() => startEditOrder(row.orderId!)}
                          className="btn-primary"
                          style={{
                            padding: '2px 6px',
                            fontSize: '13px',
                            background: 'rgba(37, 99, 235, 0.15)',
                            border: '1px solid rgba(37, 99, 235, 0.4)',
                            color: 'var(--primary)',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            boxShadow: 'none'
                          }}
                          title="주문서 수정"
                        >
                          수정
                        </button>
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>

                    {/* 삭제 */}
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(row)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                        title="해당 데이터 영구 삭제"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={16} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  조건에 해당하는 주문 내역이 없습니다.
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

    </div>
  );
};
