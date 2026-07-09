// src/firebase/mockDb.ts

// 1. Types & Interfaces
export interface GoldRates {
  date: string; // YYYY-MM-DD
  buy_rates: {
    gold_24k_per_g: number;
    gold_18k_per_g: number;
    gold_14k_per_g: number;
    silver_per_g: number;
    gold_24k_per_don: number;
  };
  sell_rates: {
    gold_24k_per_g: number;
    gold_18k_per_g: number;
    gold_14k_per_g: number;
    silver_per_g: number;
    gold_24k_per_don: number;
  };
  updated_at: string;
  updated_by: string;
}

export interface Stone {
  stone_id: string;
  name: string;
  shape: string;
  size: string;
  weight_carat: number;
  deduction_weight?: number; // 차감 중량
  grade_prices: {
    [grade: string]: number; // grade_1, grade_2, grade_3, grade_4
  };
  purchase_price?: number;
  note?: string;
  updated_at: string;
}

export interface AuditLog {
  log_id: string;
  timestamp: string;
  operator: string;
  target_type: 'order' | 'customer' | 'rates' | 'catalog' | 'stones';
  target_id: string;
  action_type: 'create' | 'modify' | 'delete';
  description: string;
  before_value?: string;
  after_value?: string;
}

export interface Customer {
  customer_id: string;
  name: string;
  code: string;
  grade: number; // 1 to 4
  owner_name: string;
  phone: string;
  mobile?: string; // 핸드폰
  loss_rate: number; // 해리적용율 (%)
  trade_type: 'weight' | 'price'; // 거래형태: 'weight' (중량), 'price' (시세)
  business_number?: string; // 사업자등록번호
  gold_balance_24k_g: number; // 순금 미수 중량
  receivable_amount: number; // 미수 금액
  note?: string; // 메모
  created_at: string;
  updated_at: string;
}

export interface GoldTransaction {
  transaction_id: string;
  customer_id: string;
  type: 'in' | 'out'; // in: 실물 입고(미수 차감), out: 출고 등(미수 가산)
  gold_type: string; // '24K'
  weight_g: number;
  note: string;
  created_at: string;
  created_by: string;
}

export interface CatalogItem {
  model_number: string;
  category: string;
  is_set: boolean;
  set_model_numbers?: string[];
  materials: string[]; // 14K, 18K, 24K, Silver
  base_labor_fees: {
    [material: string]: {
      [grade: string]: number;
    };
  };
  extra_labor_fee: number;
  default_stones: {
    stone_id: string;
    quantity: number;
    description?: string;
  }[];
  images: string[];
  created_at: string;
  manufacturer?: string;
  manufacturer_code?: string;
  vendor?: string;
  base_weight?: number;
  stock_qty?: number;
  rental_qty?: number;
  sold_qty?: number;
  note?: string;
  manual_deduction_weight?: number;
  labor_fees_v2?: {
    [material: string]: {
      type: string;        // '기본', '추가1', '추가2', '추가3'
      color: string;       // 'YG', 'WG', 'RG', '' (전체색상)
      cost: number;        // 구매원가
      grade_1: number;
      grade_2: number;
      grade_3: number;
      grade_4: number;
    }[];
  };
  updated_at: string;
}

export interface OrderItem {
  item_id: number;
  model_number: string;     // 주문모델
  division: '판매' | '결제' | '반품' | 'DC'; // 개별 구분 추가
  manufacturer: string;     // 제조사
  quantity: number;         // 수량
  color: string;            // 색상 (YG, WG, RG)
  material: string;         // 재질 (14K, 18K, 24K, Silver)
  status?: '접수' | '공장발주' | '출고대기' | '출고완료' | '보류'; // 품목 개별 상태
  labor_cost?: number;      // 공임 구매원가 추가
  
  // 스톤 종류 (마스터 연동용 ID 및 명칭)
  stone_main_id: string;    // 중심 스톤 ID
  stone_main_name: string;  // 중심 스톤명
  stone_sub_id: string;     // 보조 스톤 ID
  stone_sub_name: string;   // 보조 스톤명
  
  // 공임단가 스냅샷 (수동 수정 가능)
  labor_base: number;       // 기본 공임
  labor_extra: number;      // 추가 공임
  labor_main: number;       // 중심 스톤 공임단가
  labor_sub: number;        // 보조 스톤 공임단가
  labor_stone_total?: number; // 스톤공임 합계 금액
  grade: number;            // 급 (등급)
  
  // 알수 및 중량
  qty_main: number;         // 중심 알수 (메)
  qty_sub: number;          // 보조 알수 (보)
  stone_weight_ea: number;  // 알당 중량 (알중 / EA)
  gold_weight?: number;     // 금 중량
  
  size: string;             // 사이즈
  note: string;             // 주문 기타설명
  release_date: string;     // 출고일 (YYYY-MM-DD)
  
  calculated_price: number; // 최종 계산금액
  payment_status?: '결제완료' | '결제전' | '보류';
  
  step_weights?: {
    step1?: { before: number; after: number };
    step2?: { before: number; after: number };
    step3?: { before: number; after: number };
  };
  actual_weight_g?: number;
  
  // 하위 호환 필드
  estimated_weight_g?: number;
  labor_fee_snapshot?: {
    base_labor_fee: number;
    extra_labor_fee: number;
  };
  stones?: {
    stone_id: string;
    name: string;
    quantity: number;
    price_snapshot: number;
    is_changed: boolean;
  }[];
}

export interface Order {
  order_id: string;
  order_date: string;
  status: '접수' | '공장발주' | '출고대기' | '출고완료' | '보류';
  division?: '판매' | '결제' | '반품' | 'DC'; // 신규 구분 필드
  customer_snapshot: {
    customer_id: string;
    name: string;
    grade: number;
    phone?: string;
    loss_rate?: number;
    trade_type?: 'weight' | 'price';
    business_number?: string;
  };
  gold_rate_snapshot: {
    buy_14k_per_g: number;
    buy_18k_per_g: number;
    buy_24k_per_g: number;
    sell_14k_per_g: number;
    sell_18k_per_g: number;
    sell_24k_per_g: number;
  };
  items: OrderItem[];
  total_amount: number;
  total_gold_weight_24k_g: number;
  created_at: string;
}

// 2. Initial Seed Data
const defaultGoldRates: GoldRates[] = [];

const defaultStones: Stone[] = [];

const defaultCustomers: Customer[] = [];

const defaultCatalog: CatalogItem[] = [];

const defaultOrders: Order[] = [];
const defaultTransactions: GoldTransaction[] = [];

// 3. Database Engine Implementation
export const mockDb = {
  init() {
    const CURRENT_VERSION = 'v11';
    const savedVersion = localStorage.getItem('mock_db_version');
    
    if (savedVersion !== CURRENT_VERSION) {
      localStorage.removeItem('gold_rates');
      localStorage.removeItem('stones');
      localStorage.removeItem('customers');
      localStorage.removeItem('catalog');
      localStorage.removeItem('orders');
      localStorage.removeItem('gold_transactions');
      localStorage.setItem('mock_db_version', CURRENT_VERSION);
    }

    if (!localStorage.getItem('gold_rates')) {
      localStorage.setItem('gold_rates', JSON.stringify(defaultGoldRates));
    }
    if (!localStorage.getItem('stones')) {
      localStorage.setItem('stones', JSON.stringify(defaultStones));
    }
    if (!localStorage.getItem('customers')) {
      // Reset customer balances to 0 initially, they will be accumulated via order creation
      const initialCustomers = defaultCustomers.map(c => ({
        ...c,
        gold_balance_24k_g: 0,
        receivable_amount: 0
      }));
      localStorage.setItem('customers', JSON.stringify(initialCustomers));
    }
    if (!localStorage.getItem('catalog')) {
      localStorage.setItem('catalog', JSON.stringify(defaultCatalog));
    }
    if (!localStorage.getItem('orders')) {
      localStorage.setItem('orders', JSON.stringify([]));
      localStorage.setItem('gold_transactions', JSON.stringify(defaultTransactions));

      // Re-create each default order to correctly calculate balances and transactions
      defaultOrders.forEach(order => {
        this.createOrder(order);
      });
    }
    if (!localStorage.getItem('gold_transactions')) {
      localStorage.setItem('gold_transactions', JSON.stringify(defaultTransactions));
    }
  },

  // GET ALL
  getGoldRates(): GoldRates[] {
    return JSON.parse(localStorage.getItem('gold_rates') || '[]');
  },
  getStones(): Stone[] {
    return JSON.parse(localStorage.getItem('stones') || '[]');
  },
  getCustomers(): Customer[] {
    return JSON.parse(localStorage.getItem('customers') || '[]');
  },
  getCatalog(): CatalogItem[] {
    const list: CatalogItem[] = JSON.parse(localStorage.getItem('catalog') || '[]');
    return list.map(item => ({
      ...item,
      images: (item.images || []).filter(img => img && !img.startsWith('blob:'))
    }));
  },
  getOrders(): Order[] {
    return JSON.parse(localStorage.getItem('orders') || '[]');
  },
  getTransactions(): GoldTransaction[] {
    return JSON.parse(localStorage.getItem('gold_transactions') || '[]');
  },

  // SAVE GOLD RATES
  saveGoldRate(rates: GoldRates) {
    const list = this.getGoldRates();
    const index = list.findIndex(r => r.date === rates.date);
    if (index >= 0) {
      list[index] = rates;
    } else {
      list.push(rates);
    }
    localStorage.setItem('gold_rates', JSON.stringify(list));
  },

  // SAVE STONE
  saveStone(stone: Stone) {
    const list = this.getStones();
    const index = list.findIndex(s => s.stone_id === stone.stone_id);
    if (index >= 0) {
      list[index] = stone;
    } else {
      list.push(stone);
    }
    localStorage.setItem('stones', JSON.stringify(list));
  },

  // ADD TRANSACTION & RECALCULATE CUSTOMER GOLD BALANCE
  addGoldTransaction(tx: GoldTransaction) {
    const list = this.getTransactions();
    list.push(tx);
    localStorage.setItem('gold_transactions', JSON.stringify(list));

    // Recalculate customer's gold balance (Cloud Functions simulation)
    const customers = this.getCustomers();
    const customer = customers.find(c => c.customer_id === tx.customer_id);
    if (customer) {
      if (tx.type === 'in') {
        // 실물 금 입고 -> 미수 차감
        customer.gold_balance_24k_g = Math.max(0, parseFloat((customer.gold_balance_24k_g - tx.weight_g).toFixed(3)));
      } else {
        // 미수 가산
        customer.gold_balance_24k_g = parseFloat((customer.gold_balance_24k_g + tx.weight_g).toFixed(3));
      }
      customer.updated_at = new Date().toISOString();
      localStorage.setItem('customers', JSON.stringify(customers));
    }
  },

  // CREATE ORDER & RECALCULATE CUSTOMER GOLD & MONEY RECEIVABLE
  createOrder(order: Order) {
    const list = this.getOrders();
    list.push(order);
    localStorage.setItem('orders', JSON.stringify(list));

    // Update customer gold and money balance (Cloud Functions simulation)
    const customers = this.getCustomers();
    const customer = customers.find(c => c.customer_id === order.customer_snapshot.customer_id);
    if (customer) {
      const isWeightTrade = customer.trade_type === 'weight';

      // 아이템 단위로 순회하며 정산 가감 계산
      order.items.forEach(item => {
        const division = item.division || '판매';
        
        // 전체 금액 (금값 + 공임비)
        const itemAmount = item.calculated_price || 0;

        // 순수 공임비 합산
        const baseLabor = item.labor_base || 0;
        const extraLabor = item.labor_extra || 0;
        const mainStoneLabor = (item.labor_main || 0) * (item.qty_main || 0);
        const subStoneLabor = (item.labor_sub || 0) * (item.qty_sub || 0);
        const totalLaborCost = (baseLabor + extraLabor + mainStoneLabor + subStoneLabor) * item.quantity;

        if (division === '판매') {
          if (isWeightTrade) {
            // 중량 거래: 금 중량 가산은 하단 addGoldTransaction에서 처리하므로, 여기서는 현금 미수(공임비만)만 가산
            customer.receivable_amount += totalLaborCost;
          } else {
            // 시세 거래: 순금 미수는 가산하지 않고, 현금 미수에 전체 금액(금값 + 공임비) 가산
            customer.receivable_amount += itemAmount;
          }
        } else if (division === '결제' || division === '반품') {
          if (isWeightTrade) {
            // 중량 거래: 금 중량 차감은 하단 addGoldTransaction에서 처리하므로, 여기서는 현금 미수(공임비만)만 차감
            customer.receivable_amount = customer.receivable_amount - totalLaborCost;
          } else {
            // 시세 거래: 전체 금액 차감
            customer.receivable_amount = customer.receivable_amount - itemAmount;
          }
        } else if (division === 'DC') {
          // DC는 구분 없이 금액 미수만 차감
          customer.receivable_amount = customer.receivable_amount - itemAmount;
        }
      });
      customer.updated_at = new Date().toISOString();
      localStorage.setItem('customers', JSON.stringify(customers));
    }

    // 각 아이템별로 가산/차감 내역에 상응하는 system GoldTransaction 생성 (중량 거래처일 때만 생성)
    if (customer && customer.trade_type === 'weight') {
      order.items.forEach((item, itemIdx) => {
        const division = item.division || '판매';
        const lossRate = order.customer_snapshot.loss_rate || customer?.loss_rate || 0;
        const lossMultiplier = (1 + lossRate / 100);
        const purityMultiplier = item.material === '14K' ? (0.585 * lossMultiplier) 
                               : item.material === '18K' ? (0.750 * lossMultiplier) 
                               : 1.0;
        const itemGoldWeight24k = (item.estimated_weight_g || 0) * item.quantity * purityMultiplier;
        if (itemGoldWeight24k <= 0) return; // 금 중량이 0 이하인 경우는 트랜잭션 생략

        this.addGoldTransaction({
          transaction_id: `TX-${order.order_id}-${itemIdx}`,
          customer_id: order.customer_snapshot.customer_id,
          type: division === '판매' ? 'out' : 'in',
          gold_type: '24K',
          weight_g: parseFloat(itemGoldWeight24k.toFixed(3)),
          note: `${division} 등록: ${order.order_id} (행 ${itemIdx + 1})`,
          created_at: new Date().toISOString(),
          created_by: 'system'
        });
      });
    }
  },

  // UPDATE ORDER STATUS
  updateOrderStatus(orderId: string, status: Order['status']) {
    const list = this.getOrders();
    const order = list.find(o => o.order_id === orderId);
    if (order) {
      order.status = status;
      localStorage.setItem('orders', JSON.stringify(list));
    }
  },

  // UPDATE MULTIPLE ORDERS STATUS AT ONCE
  updateMultipleOrderStatus(orderIds: string[], status: Order['status']) {
    const list = this.getOrders();
    orderIds.forEach(orderId => {
      const trimmedId = orderId.trim();
      const order = list.find(o => o.order_id.trim() === trimmedId);
      if (order) {
        order.status = status;
      }
    });
    localStorage.setItem('orders', JSON.stringify(list));
  },

  // UPDATE ORDER ITEM PAYMENT STATUS
  updateOrderItemPaymentStatus(orderId: string, itemId: number, status: '결제완료' | '결제전' | '보류') {
    const list = this.getOrders();
    const order = list.find(o => o.order_id === orderId);
    if (order) {
      const item = order.items.find(i => i.item_id === itemId);
      if (item) {
        item.payment_status = status;
        localStorage.setItem('orders', JSON.stringify(list));
      }
    }
  },

  // UPDATE MULTIPLE ORDER ITEMS PAYMENT STATUS
  updateMultipleOrderItemsPaymentStatus(updates: { orderId: string, itemId: number }[], status: '결제완료' | '결제전' | '보류') {
    const list = this.getOrders();
    updates.forEach(({ orderId, itemId }) => {
      const order = list.find(o => o.order_id === orderId);
      if (order) {
        const item = order.items.find(i => i.item_id === itemId);
        if (item) {
          item.payment_status = status;
        }
      }
    });
    localStorage.setItem('orders', JSON.stringify(list));
  },

  // SAVE OR UPDATE CUSTOMER
  saveCustomer(customer: Customer) {
    const list = this.getCustomers();
    const index = list.findIndex(c => c.customer_id === customer.customer_id);
    if (index >= 0) {
      list[index] = customer;
    } else {
      list.push(customer);
    }
    localStorage.setItem('customers', JSON.stringify(list));
  },

  // DELETE CUSTOMER
  deleteCustomer(customerId: string) {
    const list = this.getCustomers();
    const filtered = list.filter(c => c.customer_id !== customerId);
    localStorage.setItem('customers', JSON.stringify(filtered));
  },

  // DELETE ORDER & REVERT CUSTOMER BALANCE
  deleteOrder(orderId: string) {
    const list = this.getOrders();
    const orderIndex = list.findIndex(o => o.order_id === orderId);
    if (orderIndex >= 0) {
      const order = list[orderIndex];
      const customers = this.getCustomers();
      const customer = customers.find(c => c.customer_id === order.customer_snapshot.customer_id);
      if (customer) {
        const isWeightTrade = customer.trade_type === 'weight';
        order.items.forEach(item => {
          const division = item.division || '판매';
          const lossRate = customer.loss_rate || 0;
          const lossMultiplier = (1 + lossRate / 100);
          const purityMultiplier = item.material === '14K' ? (0.585 * lossMultiplier) 
                                 : item.material === '18K' ? (0.750 * lossMultiplier) 
                                 : 1.0;
          
          const itemGoldWeight24k = (item.estimated_weight_g || 0) * item.quantity * purityMultiplier;
          const itemAmount = item.calculated_price || 0;

          const baseLabor = item.labor_base || 0;
          const extraLabor = item.labor_extra || 0;
          const mainStoneLabor = (item.labor_main || 0) * (item.qty_main || 0);
          const subStoneLabor = (item.labor_sub || 0) * (item.qty_sub || 0);
          const totalLaborCost = (baseLabor + extraLabor + mainStoneLabor + subStoneLabor) * item.quantity;

          if (division === '판매') {
            if (isWeightTrade) {
              customer.gold_balance_24k_g = parseFloat((customer.gold_balance_24k_g - itemGoldWeight24k).toFixed(3));
              customer.receivable_amount = customer.receivable_amount - totalLaborCost;
            } else {
              customer.receivable_amount = customer.receivable_amount - itemAmount;
            }
          } else if (division === '결제' || division === '반품') {
            if (isWeightTrade) {
              customer.gold_balance_24k_g = parseFloat((customer.gold_balance_24k_g + itemGoldWeight24k).toFixed(3));
              customer.receivable_amount += totalLaborCost;
            } else {
              customer.receivable_amount += itemAmount;
            }
          } else if (division === 'DC') {
            customer.receivable_amount += itemAmount;
          }
        });
        customer.updated_at = new Date().toISOString();
        localStorage.setItem('customers', JSON.stringify(customers));
      }

      // Delete corresponding system generated transactions
      const transactions = this.getTransactions();
      const filteredTx = transactions.filter(tx => !tx.note.includes(orderId));
      localStorage.setItem('gold_transactions', JSON.stringify(filteredTx));

      // Remove order
      list.splice(orderIndex, 1);
      localStorage.setItem('orders', JSON.stringify(list));
    }
  },

  // DELETE MANUAL TRANSACTION & REVERT CUSTOMER GOLD BALANCE
  deleteTransaction(transactionId: string) {
    const list = this.getTransactions();
    const txIndex = list.findIndex(t => t.transaction_id === transactionId);
    if (txIndex >= 0) {
      const tx = list[txIndex];
      const customers = this.getCustomers();
      const customer = customers.find(c => c.customer_id === tx.customer_id);
      if (customer) {
        if (tx.type === 'in') {
          customer.gold_balance_24k_g = parseFloat((customer.gold_balance_24k_g + tx.weight_g).toFixed(3));
        } else {
          customer.gold_balance_24k_g = Math.max(0, parseFloat((customer.gold_balance_24k_g - tx.weight_g).toFixed(3)));
        }
        customer.updated_at = new Date().toISOString();
        localStorage.setItem('customers', JSON.stringify(customers));
      }

      list.splice(txIndex, 1);
      localStorage.setItem('gold_transactions', JSON.stringify(list));
    }
  },

  // UPDATE ORDER ITEM STEP WEIGHTS (For jewelry craft loss tracking)
  updateOrderItemStepWeights(orderId: string, itemId: number, stepWeights: any) {
    const list = this.getOrders();
    const order = list.find(o => o.order_id === orderId);
    if (order) {
      const item = order.items.find(i => i.item_id === itemId);
      if (item) {
        item.step_weights = stepWeights;
        localStorage.setItem('orders', JSON.stringify(list));
      }
    }
  },

  // UPDATE ORDER ITEM ACTUAL WEIGHT & RECALCULATE PRICE & BALANCE
  updateOrderItemActualWeight(orderId: string, itemId: number, actualWeightG: number) {
    const list = this.getOrders();
    const orderIndex = list.findIndex(o => o.order_id === orderId);
    if (orderIndex >= 0) {
      const order = list[orderIndex];
      
      // 1. 기존 주문 정산 롤백 (고객 잔고 복구 및 system transaction 삭제)
      this.deleteOrder(orderId);

      // 2. 롤백 후 메모리에 있는 order 객체의 아이템 중량 및 가격 수정
      const item = order.items.find(i => i.item_id === itemId);
      if (item) {
        item.actual_weight_g = actualWeightG;
        
        // 시세거래처 금액 재계산용 시세 파싱
        const mat = item.material || '14K';
        const sellRate = mat === '14K' ? order.gold_rate_snapshot.sell_14k_per_g 
                        : mat === '18K' ? order.gold_rate_snapshot.sell_18k_per_g
                        : mat === '24K' ? order.gold_rate_snapshot.sell_24k_per_g
                        : 0;
        
        // 실제 중량 기준 금값 + 총공임비
        const goldCost = actualWeightG * sellRate;
        
        const baseLabor = item.labor_base || 0;
        const extraLabor = item.labor_extra || 0;
        const stoneLabor = item.labor_stone_total !== undefined ? item.labor_stone_total : ((item.labor_main || 0) * (item.qty_main || 0) + (item.labor_sub || 0) * (item.qty_sub || 0));
        const totalLaborCost = baseLabor + extraLabor + stoneLabor;
        
        item.calculated_price = Math.round((goldCost + totalLaborCost) * item.quantity);
      }

      // 주문 전체금액 및 24K 순금 환산 중량 다시 집계
      order.total_amount = order.items.reduce((sum, i) => {
        const sign = i.division === '판매' ? 1 : -1;
        return sum + ((i.calculated_price || 0) * sign);
      }, 0);

      const customers = this.getCustomers();
      const customer = customers.find(c => c.customer_id === order.customer_snapshot.customer_id);
      const lossRate = order.customer_snapshot.loss_rate || customer?.loss_rate || 0;
      const lossMultiplier = (1 + lossRate / 100);

      order.total_gold_weight_24k_g = parseFloat(order.items.reduce((sum, i) => {
        const sign = i.division === '판매' ? 1 : -1;
        const multiplier = i.material === '14K' ? (0.585 * lossMultiplier) 
                         : i.material === '18K' ? (0.750 * lossMultiplier) 
                         : 1.0;
        const wt = i.actual_weight_g !== undefined ? i.actual_weight_g : (i.estimated_weight_g || 0);
        return sum + (wt * i.quantity * multiplier * sign);
      }, 0).toFixed(3));

      // 3. 재집계된 주문 데이터를 DB에 재생성하여 고객 잔고에 차액 반영
      this.createOrder(order);
    }
  },

  // AUDIT LOGS
  getAuditLogs(): AuditLog[] {
    return JSON.parse(localStorage.getItem('audit_logs') || '[]');
  },

  addAuditLog(log: Omit<AuditLog, 'log_id' | 'timestamp'>) {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      ...log,
      log_id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog); // 최신 순 정렬
    localStorage.setItem('audit_logs', JSON.stringify(logs));
    return newLog;
  }
};

