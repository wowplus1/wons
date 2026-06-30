// src/store/useErpStore.ts
import { create } from 'zustand';
import { db } from '../firebase/config';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  writeBatch, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';
import type { GoldRates, Stone, Customer, CatalogItem, Order, OrderItem, GoldTransaction } from '../firebase/mockDb';

// 특정 재질, 색상, 등급에 대응하는 공임비(판매가)와 구매원가(cost)를 조회하는 헬퍼 함수
export const getCatalogLaborFees = (
  catalogItem: CatalogItem,
  material: string,
  color: string,
  grade: number
) => {
  const mat = material || '14K';
  const itemGradeKey = `grade_${grade}`;

  // 1. 색상별 공임 데이터(v2)가 존재하는 경우
  if (catalogItem.labor_fees_v2 && catalogItem.labor_fees_v2[mat]) {
    const fees = catalogItem.labor_fees_v2[mat];
    
    // 해당 색상과 정확히 일치하는 행 조회
    let matchedFee = fees.find(f => f.color === color);
    
    let isMatched = true;
    if (!matchedFee) {
      isMatched = false;
      // 매칭되는 색상이 없다면 전체색상('') 행을 조회하고, G(옐로우)인 경우에 한해서만 최후의 수단으로 '기본' 행으로 매핑
      matchedFee = fees.find(f => f.color === '');
      if (!matchedFee && (color === 'G' || color === 'YG')) {
        matchedFee = fees.find(f => f.type === '기본');
        isMatched = true;
      }
    }
    
    if (matchedFee) {
      const laborBase = (matchedFee as any)[itemGradeKey] || 0;
      const laborCost = matchedFee.cost || 0;
      return { laborBase, laborCost, isMatched: isMatched && laborBase > 0 };
    }
    return { laborBase: 0, laborCost: 0, isMatched: false };
  }

  // 2. 구버전 데이터 호환용 폴백 (v2 데이터가 없을 때)
  const baseLabor = catalogItem.base_labor_fees[mat] || { grade_1: 0, grade_2: 0, grade_3: 0, grade_4: 0 };
  const laborBase = (baseLabor as any)[itemGradeKey] || 0;
  
  let extra = 0;
  let isMatched = false;
  
  if (color === 'G' || color === 'YG') {
    isMatched = laborBase > 0;
  }
  
  // W(화이트)인 경우 기존 extra_labor_fee 가산 처리
  if (color === 'W' || color === 'WG') {
    extra = catalogItem.extra_labor_fee || 0;
    if (extra > 0) {
      isMatched = true;
    }
  }
  
  return { laborBase: laborBase + extra, laborCost: 0, isMatched };
};

interface ErpState {
  // DB States
  goldRates: GoldRates[];
  stones: Stone[];
  customers: Customer[];
  catalog: CatalogItem[];
  orders: Order[];
  transactions: GoldTransaction[];
  
  // Dashboard Metrics
  currentRates: GoldRates | null;
  totalReceivable: number;
  totalGoldBalance24k: number;
  
  // App UI States
  loading: boolean;
  selectedCustomerForOrder: Customer | null;
  currentOrderItems: Partial<OrderItem>[];
  activeTab: 'customers' | 'dashboard' | 'order' | 'ledger' | 'catalog' | 'rates' | 'stones' | 'orders' | 'work_list' | 'release_list' | 'unpaid_ledger' | 'paid_ledger' | 'hold_ledger';
  editingOrderId: string | null;
  
  // Actions
  fetchDb: (targetCollections?: ('gold_rates' | 'stones' | 'customers' | 'catalog' | 'orders' | 'gold_transactions')[]) => Promise<void>;
  setActiveTab: (tab: 'customers' | 'dashboard' | 'order' | 'ledger' | 'catalog' | 'rates' | 'stones' | 'orders' | 'work_list' | 'release_list' | 'unpaid_ledger' | 'paid_ledger' | 'hold_ledger') => void;
  startEditOrder: (orderId: string) => void;
  cancelEditOrder: () => void;
  updateGoldRate: (rates: GoldRates) => Promise<void>;
  selectCustomer: (customer: Customer | null) => void;
  addOrderItem: (item: Partial<OrderItem>) => void;
  updateOrderItem: (index: number, item: Partial<OrderItem>) => void;
  removeOrderItem: (index: number) => void;
  clearOrderForm: () => void;
  submitOrder: () => Promise<string | null>;
  addGoldPayment: (customerId: string, weightG: number, note: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  updateMultipleOrderStatus: (orderIds: string[], status: Order['status']) => Promise<void>;
  updateMultipleItemsStatus: (updates: { orderId: string, itemId: number }[], status: Order['status']) => Promise<void>;
  addStone: (stone: Stone) => Promise<void>;
  saveCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  updateItemPaymentStatus: (orderId: string, itemId: number, status: '결제완료' | '결제전' | '보류') => Promise<void>;
  updateMultipleItemsPaymentStatus: (updates: { orderId: string, itemId: number }[], status: '결제완료' | '결제전' | '보류') => Promise<void>;
  updateItemStepWeights: (orderId: string, itemId: number, stepWeights: any) => Promise<void>;
  updateItemActualWeight: (orderId: string, itemId: number, actualWeightG: number) => Promise<void>;
  updateItemStepWeightsAndActualWeight: (orderId: string, itemId: number, stepWeights: any, actualWeightG?: number) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  deleteOrderItem: (orderId: string, itemId: number) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  saveCatalogItem: (item: CatalogItem) => Promise<void>;
  prefetchDb: (targetCollections: ('catalog' | 'stones')[]) => Promise<void>;
}

const LOCAL_STORAGE_KEY = 'wons_erp_cache';

// 로컬스토리지에 데이터 캐시 저장
const saveCacheToLocalStorage = (data: {
  goldRates?: any[];
  stones?: any[];
  customers?: any[];
  catalog?: any[];
  orders?: any[];
  transactions?: any[];
}) => {
  try {
    const existing = localStorage.getItem(LOCAL_STORAGE_KEY);
    const existingData = existing ? JSON.parse(existing) : {};
    const merged = { ...existingData, ...data, cached_at: new Date().toISOString() };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.error("Failed to save local storage cache", e);
  }
};

// 로컬스토리지에서 캐시 데이터 로드
const loadCacheFromLocalStorage = () => {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error("Failed to load local storage cache", e);
  }
  return null;
};

export const useErpStore = create<ErpState>((set, get) => {
  const cachedData = loadCacheFromLocalStorage() || {};
  const sortedRates = cachedData.goldRates ? [...cachedData.goldRates].sort((a: any, b: any) => b.date.localeCompare(a.date)) : [];

  return {
    goldRates: cachedData.goldRates || [],
    stones: cachedData.stones || [],
    customers: cachedData.customers || [],
    catalog: cachedData.catalog || [],
    orders: cachedData.orders || [],
    transactions: cachedData.transactions || [],
    
    currentRates: sortedRates[0] || null,
    totalReceivable: cachedData.customers ? cachedData.customers.reduce((sum: number, c: any) => sum + c.receivable_amount, 0) : 0,
    totalGoldBalance24k: cachedData.customers ? cachedData.customers.reduce((sum: number, c: any) => sum + c.gold_balance_24k_g, 0) : 0,
    
    loading: false,
    selectedCustomerForOrder: null,
    currentOrderItems: [],
    activeTab: 'dashboard',
    editingOrderId: null,

    setActiveTab: (tab) => set({ activeTab: tab }),

    fetchDb: async (targetCollections) => {
    set({ loading: true });
    try {
      const collectionsToFetch = targetCollections || [
        'gold_rates',
        'stones',
        'customers',
        'catalog',
        'orders',
        'gold_transactions'
      ];

      const promises = collectionsToFetch.map(col => getDocs(collection(db, col)));
      const results = await Promise.all(promises);

      const updates: any = {};

      collectionsToFetch.forEach((col, index) => {
        const snap = results[index];
        const data = snap.docs.map(d => d.data());

        if (col === 'gold_rates') {
          updates.goldRates = data as GoldRates[];
          const sortedRates = [...(data as GoldRates[])].sort((a, b) => b.date.localeCompare(a.date));
          updates.currentRates = sortedRates[0] || null;
        } else if (col === 'stones') {
          updates.stones = data as Stone[];
        } else if (col === 'customers') {
          updates.customers = data as Customer[];
          updates.totalReceivable = (data as Customer[]).reduce((sum, c) => sum + c.receivable_amount, 0);
          updates.totalGoldBalance24k = (data as Customer[]).reduce((sum, c) => sum + c.gold_balance_24k_g, 0);
        } else if (col === 'catalog') {
          updates.catalog = data as CatalogItem[];
        } else if (col === 'orders') {
          updates.orders = data as Order[];
        } else if (col === 'gold_transactions') {
          updates.transactions = data as GoldTransaction[];
        }
      });

      set(updates);

      // 로컬스토리지 캐시 동기화
      const storeState = get();
      saveCacheToLocalStorage({
        goldRates: storeState.goldRates,
        stones: storeState.stones,
        customers: storeState.customers,
        catalog: storeState.catalog,
        orders: storeState.orders,
        transactions: storeState.transactions
      });

    } catch (error) {
      console.error("fetchDb error: ", error);
    } finally {
      set({ loading: false });
    }
  },

  prefetchDb: async (targetCollections) => {
    try {
      const snapPromise = targetCollections.map(col => getDocs(collection(db, col)));
      const results = await Promise.all(snapPromise);
      const updates: any = {};
      
      targetCollections.forEach((col, index) => {
        const snap = results[index];
        const data = snap.docs.map(d => d.data());
        
        if (col === 'catalog') {
          updates.catalog = data as CatalogItem[];
        } else if (col === 'stones') {
          updates.stones = data as Stone[];
        }
      });
      set(updates);

      // 로컬스토리지 캐시 동기화
      const storeState = get();
      saveCacheToLocalStorage({
        catalog: storeState.catalog,
        stones: storeState.stones
      });

    } catch (error) {
      console.error("prefetchDb error: ", error);
    }
  },

  updateGoldRate: async (rates: GoldRates) => {
    try {
      await setDoc(doc(db, 'gold_rates', rates.date), rates);
      await get().fetchDb();
    } catch (error) {
      console.error("updateGoldRate error: ", error);
    }
  },

  selectCustomer: (customer: Customer | null) => {
    set({ 
      selectedCustomerForOrder: customer,
      currentOrderItems: []
    });
  },

  addOrderItem: (item: Partial<OrderItem>) => {
    const items = get().currentOrderItems;
    const nextId = items.length > 0 ? (Math.max(...items.map(i => i.item_id || 0)) + 1) : 1;
    
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const defaultRelease = d.toISOString().split('T')[0];

    set({
      currentOrderItems: [...items, { item_id: nextId, quantity: 1, release_date: defaultRelease, division: '판매', note: '', ...item }]
    });
  },

  updateOrderItem: (index: number, updatedItem: Partial<OrderItem>) => {
    const items = [...get().currentOrderItems];
    const prevItem = { ...items[index] }; // 변경 전 원본 상태 백업
    const isModelChanged = updatedItem.model_number !== undefined && updatedItem.model_number !== items[index].model_number;
    const isDivisionChanged = updatedItem.division !== undefined && updatedItem.division !== items[index].division;
    
    items[index] = { ...items[index], ...updatedItem };
    const item = items[index];
    const currentRates = get().currentRates;
    const selectedCustomer = get().selectedCustomerForOrder;

    if (isDivisionChanged && item.division === '결제') {
      item.model_number = '결제';
      item.manufacturer = '자체';
      item.color = '';
      item.material = '';
      item.quantity = 1;
      item.qty_main = 0;
      item.qty_sub = 0;
      item.stone_main_id = '';
      item.stone_main_name = '';
      item.stone_sub_id = '';
      item.stone_sub_name = '';
      item.labor_main = 0;
      item.labor_sub = 0;
      item.stone_weight_ea = 0;
      item.labor_extra = 0;
      item.size = '';
    }

    if (selectedCustomer) {
      if (item.model_number === '디자인출력') {
        if (isModelChanged) {
          item.manufacturer = '자체';
          item.color = '';
          item.material = '';
          item.quantity = 1;
          item.qty_main = 0;
          item.qty_sub = 0;
          item.stone_main_id = '';
          item.stone_main_name = '';
          item.stone_sub_id = '';
          item.stone_sub_name = '';
          item.labor_main = 0;
          item.labor_sub = 0;
          item.stone_weight_ea = 0;
          item.labor_extra = 0;
          item.size = '';
          item.labor_base = 0;
          
          const date = new Date();
          date.setDate(date.getDate() + 7);
          item.release_date = date.toISOString().split('T')[0];
        }
      } else if (item.model_number === '임시제품') {
        if (isModelChanged) {
          item.manufacturer = 'JP';
          item.material = item.material || '14K';
          item.color = item.color || 'YG';
          item.grade = selectedCustomer.grade || 3;
          
          item.labor_base = 0;
          item.labor_extra = 0;
          
          item.stone_main_id = '';
          item.stone_main_name = '';
          item.qty_main = 0;
          item.labor_main = 0;
          item.stone_weight_ea = 0;
          
          item.stone_sub_id = '';
          item.stone_sub_name = '';
          item.qty_sub = 0;
          item.labor_sub = 0;
          
          const date = new Date();
          date.setDate(date.getDate() + 7);
          item.release_date = date.toISOString().split('T')[0];
        }
      } else {
        const catalogItem = get().catalog.find(c => c.model_number === item.model_number);
        if (catalogItem) {
          const mat = isModelChanged
            ? (catalogItem.materials[0] || '14K')
            : (item.material || catalogItem.materials[0] || '14K');
          const grade = item.grade || selectedCustomer.grade || 3;
          const itemGradeKey = `grade_${grade}`;

          if (isModelChanged) {
            item.manufacturer = 'JP';
            item.material = mat;
            item.color = item.color || 'YG';
            item.grade = grade;
            
            const { laborBase, laborCost } = getCatalogLaborFees(catalogItem, mat, item.color || 'YG', grade);
            
            item.labor_base = laborBase;
            item.labor_cost = laborCost;
            item.labor_extra = 0;
            
            const dsMain = catalogItem.default_stones[0];
            const dsSub = catalogItem.default_stones[1];
            
            if (dsMain) {
              const stoneDetail = get().stones.find(s => s.stone_id === dsMain.stone_id);
              item.stone_main_id = dsMain.stone_id;
              item.stone_main_name = stoneDetail?.name || dsMain.stone_id;
              item.qty_main = dsMain.quantity;
              item.labor_main = stoneDetail?.grade_prices[itemGradeKey] || 0;
              item.stone_weight_ea = stoneDetail?.weight_carat || 0;
            } else {
              item.stone_main_id = '';
              item.stone_main_name = '';
              item.qty_main = 0;
              item.labor_main = 0;
              item.stone_weight_ea = 0;
            }
            
            if (dsSub) {
              const stoneDetail = get().stones.find(s => s.stone_id === dsSub.stone_id);
              item.stone_sub_id = dsSub.stone_id;
              item.stone_sub_name = stoneDetail?.name || dsSub.stone_id;
              item.qty_sub = dsSub.quantity;
              item.labor_sub = stoneDetail?.grade_prices[itemGradeKey] || 0;
            } else {
              item.stone_sub_id = '';
              item.stone_sub_name = '';
              item.qty_sub = 0;
              item.labor_sub = 0;
            }
            
            const date = new Date();
            date.setDate(date.getDate() + 7);
            item.release_date = date.toISOString().split('T')[0];
          }
          
          if (
            updatedItem.material !== undefined ||
            updatedItem.color !== undefined ||
            updatedItem.grade !== undefined
          ) {
            const { laborBase, laborCost, isMatched } = getCatalogLaborFees(catalogItem, mat, item.color || 'YG', grade);
            
            // 색상 변경 시에만 alert 알림창을 띄우고 이전 값으로 롤백 수행
            if (updatedItem.color !== undefined && !isMatched && item.model_number !== '임시제품' && item.model_number !== '디자인출력') {
              alert(`[알림] 선택하신 모델 [${item.model_number}]의 ${item.color || 'YG'} 색상 공임 단가가 등록되어 있지 않거나 0원입니다.\n정확한 정산을 위해 B2B 카탈로그에서 단가를 보완해 주세요.`);
              
              // 롤백: 색상값만 이전 값으로 복원
              item.color = prevItem.color;
              
              // 원복된 색상 기준으로 단가 재조회
              const rollbackColor = item.color || 'YG';
              const rollbackFees = getCatalogLaborFees(catalogItem, mat, rollbackColor, grade);
              
              item.labor_base = rollbackFees.laborBase;
              item.labor_cost = rollbackFees.laborCost;
            } else {
              // 색상 외 변경이거나 단가 매칭이 성공한 경우
              item.labor_base = laborBase;
              item.labor_cost = laborCost;
            }
            
            const currentGrade = item.grade || selectedCustomer.grade || 3;
            const currentGradeKey = `grade_${currentGrade}`;
            
            if (item.stone_main_id) {
              const stoneDetail = get().stones.find(s => s.stone_id === item.stone_main_id);
              item.labor_main = stoneDetail?.grade_prices[currentGradeKey] || 0;
            }
            if (item.stone_sub_id) {
              const stoneDetail = get().stones.find(s => s.stone_id === item.stone_sub_id);
              item.labor_sub = stoneDetail?.grade_prices[currentGradeKey] || 0;
            }
          }
        }
      }
    }

    if (currentRates) {
      if (item.division === '결제' || item.division === 'DC') {
        const baseLabor = item.labor_base || 0;
        const extraLabor = item.labor_extra || 0;
        const mainStoneLabor = (item.labor_main || 0) * (item.qty_main || 0);
        const subStoneLabor = (item.labor_sub || 0) * (item.qty_sub || 0);
        const totalLaborCost = baseLabor + extraLabor + mainStoneLabor + subStoneLabor;

        item.calculated_price = Math.round(totalLaborCost * (item.quantity || 1));
        item.estimated_weight_g = 0;
        item.labor_fee_snapshot = {
          base_labor_fee: baseLabor,
          extra_labor_fee: extraLabor
        };
        item.stones = [];
      } else if (item.model_number === '디자인출력') {
        const baseLabor = item.labor_base || 0;
        item.calculated_price = Math.round(baseLabor * (item.quantity || 1));
        item.estimated_weight_g = 0;
        item.labor_fee_snapshot = {
          base_labor_fee: baseLabor,
          extra_labor_fee: 0
        };
        item.stones = [];
      } else if (item.model_number) {
        const catalogItem = get().catalog.find(c => c.model_number === item.model_number);
        const baseWeight = catalogItem?.base_weight || 0;
        
        let subStoneWeightEa = 0;
        if (item.stone_sub_id) {
          const subStone = get().stones.find(s => s.stone_id === item.stone_sub_id);
          subStoneWeightEa = subStone?.weight_carat || 0;
        }
        
        const stonesWeightTotal = (item.qty_main || 0) * (item.stone_weight_ea || 0) + (item.qty_sub || 0) * subStoneWeightEa;
        const manualDeductionWeight = catalogItem?.manual_deduction_weight || 0;
        const pureGoldWeight = Math.max(0, baseWeight - (stonesWeightTotal + manualDeductionWeight));
        
        const mat = item.material || '14K';
        const sellRatePerG = mat === '14K' ? currentRates.sell_rates.gold_14k_per_g 
                            : mat === '18K' ? currentRates.sell_rates.gold_18k_per_g
                            : mat === '24K' ? currentRates.sell_rates.gold_24k_per_g
                            : currentRates.sell_rates.silver_per_g;
        
        const goldCost = pureGoldWeight * sellRatePerG;
        
        const baseLabor = item.labor_base || 0;
        const extraLabor = item.labor_extra || 0;
        const mainStoneLabor = (item.labor_main || 0) * (item.qty_main || 0);
        const subStoneLabor = (item.labor_sub || 0) * (item.qty_sub || 0);
        const totalLaborCost = baseLabor + extraLabor + mainStoneLabor + subStoneLabor;
        
        const singlePrice = goldCost + totalLaborCost;
        item.calculated_price = Math.round(singlePrice * (item.quantity || 1));
        
        item.estimated_weight_g = pureGoldWeight;
        item.labor_fee_snapshot = {
          base_labor_fee: baseLabor,
          extra_labor_fee: extraLabor
        };
        item.stones = [
          { stone_id: item.stone_main_id || '', name: item.stone_main_name || '', quantity: item.qty_main || 0, price_snapshot: item.labor_main || 0, is_changed: false },
          { stone_id: item.stone_sub_id || '', name: item.stone_sub_name || '', quantity: item.qty_sub || 0, price_snapshot: item.labor_sub || 0, is_changed: false }
        ].filter(s => s.stone_id);
      }
    }

    set({ currentOrderItems: items });
  },

  removeOrderItem: (index: number) => {
    const items = get().currentOrderItems.filter((_, i) => i !== index);
    set({ currentOrderItems: items.length > 0 ? items : [{ item_id: 1, quantity: 1 }] });
  },

  clearOrderForm: () => {
    set({
      selectedCustomerForOrder: null,
      currentOrderItems: [],
      editingOrderId: null
    });
  },

  submitOrder: async () => {
    const { selectedCustomerForOrder, currentOrderItems, currentRates, editingOrderId } = get();
    if (!selectedCustomerForOrder || !currentRates) return null;

    try {
      const validItems = currentOrderItems
        .filter(i => (i.division === '결제' || i.division === 'DC' || i.model_number) && i.calculated_price !== undefined)
        .map(i => {
          const division = i.division || '판매';
          const defaultStatus = (division === '결제' || division === 'DC') ? '출고대기' : '접수';
          return {
            ...i,
            division,
            status: defaultStatus,
            model_number: i.model_number || division,
            manufacturer: i.manufacturer || (division === '결제' || division === 'DC' ? '자체' : 'JP')
          };
        }) as OrderItem[];

      if (validItems.length === 0) return null;

      const totalAmount = validItems.reduce((sum, i) => {
        const sign = i.division === '판매' ? 1 : -1;
        return sum + ((i.calculated_price || 0) * sign);
      }, 0);
      
      const totalGoldWeight24k_g = validItems.reduce((sum, i) => {
        const sign = i.division === '판매' ? 1 : -1;
        const lossRate = selectedCustomerForOrder.loss_rate || 0;
        const lossMultiplier = (1 + lossRate / 100);
        const multiplier = i.material === '14K' ? (0.585 * lossMultiplier) 
                         : i.material === '18K' ? (0.750 * lossMultiplier) 
                         : 1.0;
        return sum + ((i.estimated_weight_g || 0) * i.quantity * multiplier * sign);
      }, 0);

      const orderId = editingOrderId || `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newOrder: Order = {
        order_id: orderId,
        order_date: new Date().toISOString(),
        status: '접수',
        customer_snapshot: {
          customer_id: selectedCustomerForOrder.customer_id,
          name: selectedCustomerForOrder.name,
          grade: selectedCustomerForOrder.grade,
          phone: selectedCustomerForOrder.phone,
          loss_rate: selectedCustomerForOrder.loss_rate,
          trade_type: selectedCustomerForOrder.trade_type,
          business_number: selectedCustomerForOrder.business_number
        },
        gold_rate_snapshot: {
          buy_14k_per_g: currentRates.buy_rates.gold_14k_per_g,
          buy_18k_per_g: currentRates.buy_rates.gold_18k_per_g,
          buy_24k_per_g: currentRates.buy_rates.gold_24k_per_g,
          sell_14k_per_g: currentRates.sell_rates.gold_14k_per_g,
          sell_18k_per_g: currentRates.sell_rates.gold_18k_per_g,
          sell_24k_per_g: currentRates.sell_rates.gold_24k_per_g,
        },
        items: validItems,
        total_amount: totalAmount,
        total_gold_weight_24k_g: parseFloat(totalGoldWeight24k_g.toFixed(3)),
        created_at: new Date().toISOString()
      };

      const batch = writeBatch(db);
      const customerDocRef = doc(db, 'customers', selectedCustomerForOrder.customer_id);

      let finalGold = selectedCustomerForOrder.gold_balance_24k_g;
      let finalAmount = selectedCustomerForOrder.receivable_amount;

      // 1. 수정 모드일 때 정산 롤백 처리
      // 1. 수정 모드일 때 정산 롤백 처리
      if (editingOrderId) {
        const oldOrder = get().orders.find(o => o.order_id === editingOrderId);
        if (oldOrder) {
          const isWeightTrade = selectedCustomerForOrder.trade_type === 'weight';
          
          oldOrder.items.forEach(item => {
            const itemStatus = item.status || oldOrder.status || '접수';
            if (itemStatus !== '출고완료') return; // 출고완료된 품목만 롤백 대상
            
            const division = item.division || '판매';
            if (division !== '판매') return; // 출고완료 단계에서는 판매 품목만 롤백 처리 (결제/반품/DC는 결제완료 시에만 롤백)

            const lossRate = selectedCustomerForOrder.loss_rate || 0;
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
                finalGold = Math.max(0, parseFloat((finalGold - itemGoldWeight24k).toFixed(3)));
                finalAmount = Math.max(0, finalAmount - totalLaborCost);
              } else {
                finalAmount = Math.max(0, finalAmount - itemAmount);
              }
            }
          });

          // 기존 주문 시스템 트랜잭션 삭제 예약
          const txSnap = await getDocs(collection(db, 'gold_transactions'));
          txSnap.docs.forEach(d => {
            const txData = d.data() as GoldTransaction;
            if (txData.note.includes(editingOrderId)) {
              batch.delete(doc(db, 'gold_transactions', d.id));
            }
          });

          // 기존 주문서 삭제 예약
          batch.delete(doc(db, 'orders', editingOrderId));
        }
      }

      // 2. 새 주문 내역에 따른 거래처 잔고 가산 연산
      const isWeightTrade = selectedCustomerForOrder.trade_type === 'weight';
      validItems.forEach(item => {
        const itemStatus = item.status || '접수';
        if (itemStatus !== '출고완료') return; // 출고완료된 품목만 거래처 미수에 가산
        
        const division = item.division || '판매';
        if (division !== '판매') return; // 출고완료 단계에서는 판매 품목만 가산 (결제/반품/DC는 결제완료 시에 반영)

        const itemAmount = item.calculated_price || 0;
        const baseLabor = item.labor_base || 0;
        const extraLabor = item.labor_extra || 0;
        const mainStoneLabor = (item.labor_main || 0) * (item.qty_main || 0);
        const subStoneLabor = (item.labor_sub || 0) * (item.qty_sub || 0);
        const totalLaborCost = (baseLabor + extraLabor + mainStoneLabor + subStoneLabor) * item.quantity;

        if (division === '판매') {
          if (isWeightTrade) {
            finalAmount += totalLaborCost;
          } else {
            finalAmount += itemAmount;
          }
        }
      });

      // 3. 중량거래처의 경우 금 미수 및 트랜잭션 추가 처리
      if (isWeightTrade) {
        let goldDiff = 0;
        validItems.forEach((item, itemIdx) => {
          const itemStatus = item.status || '접수';
          if (itemStatus !== '출고완료') return; // 출고완료된 품목만 금 미수에 가산

          const division = item.division || '판매';
          if (division !== '판매') return; // 중량 정산에서도 판매 품목만 가산 (결제/반품은 결제완료 시 정산)

          const lossRate = newOrder.customer_snapshot.loss_rate || selectedCustomerForOrder.loss_rate || 0;
          const lossMultiplier = (1 + lossRate / 100);
          const purityMultiplier = item.material === '14K' ? (0.585 * lossMultiplier) 
                                 : item.material === '18K' ? (0.750 * lossMultiplier) 
                                 : 1.0;
          const itemGoldWeight24k = (item.estimated_weight_g || 0) * item.quantity * purityMultiplier;
          if (itemGoldWeight24k <= 0) return;

          const txId = `TX-${orderId}-${itemIdx}`;
          const tx: GoldTransaction = {
            transaction_id: txId,
            customer_id: selectedCustomerForOrder.customer_id,
            type: division === '판매' ? 'out' : 'in',
            gold_type: '24K',
            weight_g: parseFloat(itemGoldWeight24k.toFixed(3)),
            note: `${division} 등록: ${orderId} (행 ${itemIdx + 1})`,
            created_at: new Date().toISOString(),
            created_by: 'system'
          };

          batch.set(doc(db, 'gold_transactions', txId), tx);
          const goldSign = division === '판매' ? 1 : -1;
          goldDiff += itemGoldWeight24k * goldSign;
        });

        finalGold = parseFloat((finalGold + goldDiff).toFixed(3));
      }

      // 4. 거래처 잔고 일괄 업데이트 등록
      batch.update(customerDocRef, {
        receivable_amount: finalAmount,
        gold_balance_24k_g: finalGold,
        updated_at: new Date().toISOString()
      });

      // 5. 새 주문 등록
      batch.set(doc(db, 'orders', orderId), newOrder);

      await batch.commit();
      await get().fetchDb();
      get().clearOrderForm();
      set({ activeTab: 'orders' });
      return orderId;
    } catch (error) {
      console.error("submitOrder error: ", error);
      return null;
    }
  },

  startEditOrder: (orderId: string) => {
    const order = get().orders.find(o => o.order_id === orderId);
    if (!order) return;

    const customer = get().customers.find(c => c.customer_id === order.customer_snapshot.customer_id);
    if (!customer) return;

    set({
      selectedCustomerForOrder: customer,
      currentOrderItems: order.items,
      editingOrderId: orderId,
      activeTab: 'order'
    });
  },

  cancelEditOrder: () => {
    get().clearOrderForm();
    set({ activeTab: 'orders', editingOrderId: null });
  },

  updateOrderStatus: async (orderId: string, status: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      await get().fetchDb();
    } catch (error) {
      console.error("updateOrderStatus error: ", error);
    }
  },

  updateMultipleOrderStatus: async (orderIds: string[], status: Order['status']) => {
    try {
      const batch = writeBatch(db);
      orderIds.forEach(orderId => {
        batch.update(doc(db, 'orders', orderId.trim()), { status });
      });
      await batch.commit();
      await get().fetchDb();
    } catch (error) {
      console.error("updateMultipleOrderStatus error: ", error);
    }
  },

  updateMultipleItemsStatus: async (updates: { orderId: string, itemId: number }[], status: Order['status']) => {
    try {
      const batch = writeBatch(db);
      const grouped: { [orderId: string]: number[] } = {};
      updates.forEach(({ orderId, itemId }) => {
        if (!grouped[orderId]) grouped[orderId] = [];
        grouped[orderId].push(itemId);
      });

      const customerBalanceDiffs: { [customerId: string]: { amount: number, gold: number } } = {};

      for (const orderId of Object.keys(grouped)) {
        const order = get().orders.find(o => o.order_id === orderId);
        if (order) {
          const customerId = order.customer_snapshot.customer_id;
          if (!customerBalanceDiffs[customerId]) {
            customerBalanceDiffs[customerId] = { amount: 0, gold: 0 };
          }

          const customerDetail = get().customers.find(c => c.customer_id === customerId);
          const lossRate = order.customer_snapshot.loss_rate || customerDetail?.loss_rate || 0;
          const lossMultiplier = (1 + lossRate / 100);
          const isWeightTrade = customerDetail?.trade_type === 'weight';

          const itemIds = grouped[orderId];
          const items = order.items.map(i => {
            const currentItemStatus = i.status || order.status || '접수';
            const isTarget = itemIds.includes(i.item_id);

            if (isTarget && currentItemStatus !== status) {
              const division = i.division || '판매';
              if (division === '판매') {
                const itemAmount = i.calculated_price || 0;
                const baseLabor = i.labor_base || 0;
                const extraLabor = i.labor_extra || 0;
                const mainStoneLabor = (i.labor_main || 0) * (i.qty_main || 0);
                const subStoneLabor = (i.labor_sub || 0) * (i.qty_sub || 0);
                const totalLaborCost = (baseLabor + extraLabor + mainStoneLabor + subStoneLabor) * i.quantity;

                const priceVal = isWeightTrade ? totalLaborCost : itemAmount;

                const purityMultiplier = i.material === '14K' ? (0.585 * lossMultiplier) 
                                       : i.material === '18K' ? (0.750 * lossMultiplier) 
                                       : 1.0;
                const itemGoldWeight24k = (i.estimated_weight_g || 0) * i.quantity * purityMultiplier;

                // 출고완료 진입: 미수금 가산
                if (status === '출고완료') {
                  customerBalanceDiffs[customerId].amount += priceVal;
                  customerBalanceDiffs[customerId].gold += itemGoldWeight24k;

                  if (isWeightTrade && itemGoldWeight24k > 0) {
                    const txId = `TX-${orderId}-${i.item_id}`;
                    const tx: GoldTransaction = {
                      transaction_id: txId,
                      customer_id: customerId,
                      type: 'out',
                      gold_type: '24K',
                      weight_g: parseFloat(itemGoldWeight24k.toFixed(3)),
                      note: `판매 출고완료: ${orderId} (품목 ${i.item_id})`,
                      created_at: new Date().toISOString(),
                      created_by: 'system'
                    };
                    batch.set(doc(db, 'gold_transactions', txId), tx);
                  }
                }
                // 출고완료 롤백: 미수금 차감
                else if (currentItemStatus === '출고완료') {
                  customerBalanceDiffs[customerId].amount -= priceVal;
                  customerBalanceDiffs[customerId].gold -= itemGoldWeight24k;

                  if (isWeightTrade && itemGoldWeight24k > 0) {
                    const txId = `TX-${orderId}-${i.item_id}`;
                    batch.delete(doc(db, 'gold_transactions', txId));
                  }
                }
              }
            }

            return isTarget ? { ...i, status } : { ...i, status: currentItemStatus };
          });

          const allItemsSameStatus = items.every(i => i.status === status);
          const orderStatusUpdate = allItemsSameStatus ? { items, status } : { items };
          batch.update(doc(db, 'orders', orderId), orderStatusUpdate);
        }
      }

      for (const customerId of Object.keys(customerBalanceDiffs)) {
        const diff = customerBalanceDiffs[customerId];
        if (diff.amount !== 0 || diff.gold !== 0) {
          const customerDetail = get().customers.find(c => c.customer_id === customerId);
          if (customerDetail) {
            const nextAmount = Math.max(0, customerDetail.receivable_amount + diff.amount);
            const nextGold = parseFloat(Math.max(0, customerDetail.gold_balance_24k_g + diff.gold).toFixed(3));
            batch.update(doc(db, 'customers', customerId), {
              receivable_amount: nextAmount,
              gold_balance_24k_g: nextGold,
              updated_at: new Date().toISOString()
            });
          }
        }
      }
      await batch.commit();
      await get().fetchDb();
    } catch (error) {
      console.error("updateMultipleItemsStatus error: ", error);
    }
  },

  addStone: async (stone: Stone) => {
    try {
      await setDoc(doc(db, 'stones', stone.stone_id), stone);
      await get().fetchDb();
    } catch (error) {
      console.error("addStone error: ", error);
      throw error;
    }
  },

  saveCatalogItem: async (item: CatalogItem) => {
    try {
      await setDoc(doc(db, 'catalog', item.model_number), item);
      await get().fetchDb();
    } catch (error) {
      console.error("saveCatalogItem error: ", error);
      throw error;
    }
  },

  saveCustomer: async (customer: Customer) => {
    try {
      await setDoc(doc(db, 'customers', customer.customer_id), customer);
      await get().fetchDb();
    } catch (error) {
      console.error("saveCustomer error: ", error);
      throw error;
    }
  },

  deleteCustomer: async (customerId: string) => {
    try {
      await deleteDoc(doc(db, 'customers', customerId));
      await get().fetchDb();
    } catch (error) {
      console.error("deleteCustomer error: ", error);
    }
  },

  updateItemPaymentStatus: async (orderId: string, itemId: number, status: '결제완료' | '결제전' | '보류') => {
    try {
      await get().updateMultipleItemsPaymentStatus([{ orderId, itemId }], status);
    } catch (error) {
      console.error("updateItemPaymentStatus error: ", error);
    }
  },

  updateMultipleItemsPaymentStatus: async (updates: { orderId: string, itemId: number }[], status: '결제완료' | '결제전' | '보류') => {
    try {
      const batch = writeBatch(db);
      const grouped: { [orderId: string]: number[] } = {};
      updates.forEach(({ orderId, itemId }) => {
        if (!grouped[orderId]) grouped[orderId] = [];
        grouped[orderId].push(itemId);
      });

      const customerBalanceDiffs: { [customerId: string]: { amount: number, gold: number } } = {};

      for (const orderId of Object.keys(grouped)) {
        const order = get().orders.find(o => o.order_id === orderId);
        if (order) {
          const customerId = order.customer_snapshot.customer_id;
          if (!customerBalanceDiffs[customerId]) {
            customerBalanceDiffs[customerId] = { amount: 0, gold: 0 };
          }

          const customerDetail = get().customers.find(c => c.customer_id === customerId);
          const lossRate = order.customer_snapshot.loss_rate || customerDetail?.loss_rate || 0;
          const lossMultiplier = (1 + lossRate / 100);
          const itemIds = grouped[orderId];
          const items = order.items.map(i => {
            const currentPaymentStatus = i.payment_status || '결제전';
            const isTarget = itemIds.includes(i.item_id);

            if (isTarget && currentPaymentStatus !== status) {
              const division = i.division || '판매';
              const itemAmount = i.calculated_price || 0;
              const baseLabor = i.labor_base || 0;
              const extraLabor = i.labor_extra || 0;
              const mainStoneLabor = (i.labor_main || 0) * (i.qty_main || 0);
              const subStoneLabor = (i.labor_sub || 0) * (i.qty_sub || 0);
              const totalLaborCost = (baseLabor + extraLabor + mainStoneLabor + subStoneLabor) * i.quantity;
              
              const isWeightTrade = customerDetail?.trade_type === 'weight';
              const priceVal = isWeightTrade ? totalLaborCost : itemAmount;

              const purityMultiplier = i.material === '14K' ? (0.585 * lossMultiplier) 
                                     : i.material === '18K' ? (0.750 * lossMultiplier) 
                                     : 1.0;
              const wt = i.actual_weight_g !== undefined ? i.actual_weight_g : (i.estimated_weight_g || 0);
              const itemGoldWeight24k = wt * i.quantity * purityMultiplier;

              // 결제완료 진입: 거래처 현금 미수금 차감
              if (status === '결제완료') {
                // 결제완료 대장 이동 시 모든 품목(판매, 결제, 반품, DC)의 금액이 미수금에서 차감됨
                customerBalanceDiffs[customerId].amount -= priceVal;

                // 중량거래처이고 결제/반품 구분인 경우 순금 미수 차감 및 TX 추가
                if (isWeightTrade && (division === '결제' || division === '반품') && itemGoldWeight24k > 0) {
                  customerBalanceDiffs[customerId].gold -= itemGoldWeight24k;

                  const txId = `TX-PAY-${orderId}-${i.item_id}`;
                  const tx: GoldTransaction = {
                    transaction_id: txId,
                    customer_id: customerId,
                    type: 'in', // 결제/반품은 실물 금 회수를 의미하므로 입고(in)로 순금 미수 차감
                    gold_type: '24K',
                    weight_g: parseFloat(itemGoldWeight24k.toFixed(3)),
                    note: `${division} 결제완료: ${orderId} (품목 ${i.item_id})`,
                    created_at: new Date().toISOString(),
                    created_by: 'system'
                  };
                  batch.set(doc(db, 'gold_transactions', txId), tx);
                }
              }
              // 결제완료 롤백(탈출): 거래처 현금 미수금 가산
              else if (currentPaymentStatus === '결제완료') {
                customerBalanceDiffs[customerId].amount += priceVal;

                // 중량거래처이고 결제/반품 구분인 경우 순금 미수 가산 및 TX 삭제
                if (isWeightTrade && (division === '결제' || division === '반품') && itemGoldWeight24k > 0) {
                  customerBalanceDiffs[customerId].gold += itemGoldWeight24k;

                  const txId = `TX-PAY-${orderId}-${i.item_id}`;
                  batch.delete(doc(db, 'gold_transactions', txId));
                }
              }
            }

            return isTarget ? { ...i, payment_status: status } : i;
          });

          batch.update(doc(db, 'orders', orderId), { items });
        }
      }

      for (const customerId of Object.keys(customerBalanceDiffs)) {
        const diff = customerBalanceDiffs[customerId];
        if (diff.amount !== 0 || diff.gold !== 0) {
          const customerDetail = get().customers.find(c => c.customer_id === customerId);
          if (customerDetail) {
            const nextAmount = Math.max(0, customerDetail.receivable_amount + diff.amount);
            const nextGold = parseFloat(Math.max(0, customerDetail.gold_balance_24k_g + diff.gold).toFixed(3));
            batch.update(doc(db, 'customers', customerId), {
              receivable_amount: nextAmount,
              gold_balance_24k_g: nextGold,
              updated_at: new Date().toISOString()
            });
          }
        }
      }
      await batch.commit();
      await get().fetchDb();
    } catch (error) {
      console.error("updateMultipleItemsPaymentStatus error: ", error);
    }
  },

  updateItemStepWeights: async (orderId: string, itemId: number, stepWeights: any) => {
    try {
      const order = get().orders.find(o => o.order_id === orderId);
      if (order) {
        const items = order.items.map(i => i.item_id === itemId ? { ...i, step_weights: stepWeights } : i);
        await updateDoc(doc(db, 'orders', orderId), { items });
        await get().fetchDb();
      }
    } catch (error) {
      console.error("updateItemStepWeights error: ", error);
    }
  },

  updateItemActualWeight: async (orderId: string, itemId: number, actualWeightG: number) => {
    try {
      const order = get().orders.find(o => o.order_id === orderId);
      if (!order) return;

      // 1. 기존 주문 롤백 수행
      await get().deleteOrder(orderId);

      // 2. 롤백 완료 후 최신화된 스토어 데이터 기반으로 갱신 데이터 준비
      const item = order.items.find(i => i.item_id === itemId);
      if (item) {
        item.actual_weight_g = actualWeightG;
        const mat = item.material || '14K';
        const sellRate = mat === '14K' ? order.gold_rate_snapshot.sell_14k_per_g 
                        : mat === '18K' ? order.gold_rate_snapshot.sell_18k_per_g
                        : mat === '24K' ? order.gold_rate_snapshot.sell_24k_per_g
                        : 0;
        
        const goldCost = actualWeightG * sellRate;
        const baseLabor = item.labor_base || 0;
        const extraLabor = item.labor_extra || 0;
        const mainStoneLabor = (item.labor_main || 0) * (item.qty_main || 0);
        const subStoneLabor = (item.labor_sub || 0) * (item.qty_sub || 0);
        const totalLaborCost = baseLabor + extraLabor + mainStoneLabor + subStoneLabor;
        
        item.calculated_price = Math.round((goldCost + totalLaborCost) * item.quantity);
      }

      // 재집계
      order.total_amount = order.items.reduce((sum, i) => {
        const sign = i.division === '판매' ? 1 : -1;
        return sum + ((i.calculated_price || 0) * sign);
      }, 0);

      const customersSnap = await getDocs(collection(db, 'customers'));
      const customerDetail = customersSnap.docs.find(d => d.id === order.customer_snapshot.customer_id)?.data() as Customer;
      const lossRate = order.customer_snapshot.loss_rate || customerDetail?.loss_rate || 0;
      const lossMultiplier = (1 + lossRate / 100);

      order.total_gold_weight_24k_g = parseFloat(order.items.reduce((sum, i) => {
        const sign = i.division === '판매' ? 1 : -1;
        const multiplier = i.material === '14K' ? (0.585 * lossMultiplier) 
                         : i.material === '18K' ? (0.750 * lossMultiplier) 
                         : 1.0;
        const wt = i.actual_weight_g !== undefined ? i.actual_weight_g : (i.estimated_weight_g || 0);
        return sum + (wt * i.quantity * multiplier * sign);
      }, 0).toFixed(3));

      // 3. 롤백된 자리에 재생성
      const batch = writeBatch(db);
      batch.set(doc(db, 'orders', orderId), order);

      if (customerDetail) {
        const customerDocRef = doc(db, 'customers', order.customer_snapshot.customer_id);
        const isWeightTrade = customerDetail.trade_type === 'weight';
        let nextAmount = customerDetail.receivable_amount;

        order.items.forEach(i => {
          const itemStatus = i.status || order.status || '접수';
          if (itemStatus !== '출고완료') return; // 출고완료된 품목만 미수 롤백/가산 대상

          const division = i.division || '판매';
          if (division !== '판매') return; // 출고완료 단계에서는 판매 품목만 롤백/가산 (결제/반품/DC는 결제완료 시에 반영)

          const itemAmount = i.calculated_price || 0;
          const baseLabor = i.labor_base || 0;
          const extraLabor = i.labor_extra || 0;
          const mainStoneLabor = (i.labor_main || 0) * (i.qty_main || 0);
          const subStoneLabor = (i.labor_sub || 0) * (i.qty_sub || 0);
          const totalLaborCost = (baseLabor + extraLabor + mainStoneLabor + subStoneLabor) * i.quantity;

          if (division === '판매') {
            if (isWeightTrade) {
              nextAmount += totalLaborCost;
            } else {
              nextAmount += itemAmount;
            }
          }
        });

        batch.update(customerDocRef, {
          receivable_amount: nextAmount,
          updated_at: new Date().toISOString()
        });

        if (isWeightTrade) {
          let goldDiff = 0;
          order.items.forEach((i, itemIdx) => {
            const itemStatus = i.status || order.status || '접수';
            if (itemStatus !== '출고완료') return; // 출고완료된 품목만 금 미수 롤백/가산 대상

            const division = i.division || '판매';
            if (division !== '판매') return; // 중량 정산에서도 판매 품목만 롤백/가산 (결제/반품은 결제완료 시 정산)

            const purityMultiplier = i.material === '14K' ? (0.585 * lossMultiplier) 
                                   : i.material === '18K' ? (0.750 * lossMultiplier) 
                                   : 1.0;
            const wt = i.actual_weight_g !== undefined ? i.actual_weight_g : (i.estimated_weight_g || 0);
            const itemGoldWeight24k = wt * i.quantity * purityMultiplier;
            if (itemGoldWeight24k <= 0) return;

            const txId = `TX-${orderId}-${itemIdx}`;
            const tx: GoldTransaction = {
              transaction_id: txId,
              customer_id: order.customer_snapshot.customer_id,
              type: division === '판매' ? 'out' : 'in',
              gold_type: '24K',
              weight_g: parseFloat(itemGoldWeight24k.toFixed(3)),
              note: `${division} 등록: ${orderId} (행 ${itemIdx + 1})`,
              created_at: new Date().toISOString(),
              created_by: 'system'
            };

            batch.set(doc(db, 'gold_transactions', txId), tx);
            const goldSign = division === '판매' ? 1 : -1;
            goldDiff += itemGoldWeight24k * goldSign;
          });

          const nextGold = parseFloat((customerDetail.gold_balance_24k_g + goldDiff).toFixed(3));
          batch.update(customerDocRef, {
            gold_balance_24k_g: nextGold
          });
        }
      }

      await batch.commit();
      await get().fetchDb();
    } catch (error) {
      console.error("updateItemActualWeight error: ", error);
    }
  },

  updateItemStepWeightsAndActualWeight: async (orderId: string, itemId: number, stepWeights: any, actualWeightG?: number) => {
    try {
      const order = get().orders.find(o => o.order_id === orderId);
      if (!order) return;

      // 1. 기존 주문 롤백 수행
      await get().deleteOrder(orderId);

      // 2. 롤백 완료 후 최신화된 스토어 데이터 기반으로 갱신 데이터 준비
      const item = order.items.find(i => i.item_id === itemId);
      if (item) {
        // step_weights와 actual_weight_g를 동시에 갱신!
        item.step_weights = stepWeights;
        if (actualWeightG !== undefined && actualWeightG > 0) {
          item.actual_weight_g = actualWeightG;
          const mat = item.material || '14K';
          const sellRate = mat === '14K' ? order.gold_rate_snapshot.sell_14k_per_g 
                          : mat === '18K' ? order.gold_rate_snapshot.sell_18k_per_g
                          : mat === '24K' ? order.gold_rate_snapshot.sell_24k_per_g
                          : 0;
          
          const goldCost = actualWeightG * sellRate;
          const baseLabor = item.labor_base || 0;
          const extraLabor = item.labor_extra || 0;
          const mainStoneLabor = (item.labor_main || 0) * (item.qty_main || 0);
          const subStoneLabor = (item.labor_sub || 0) * (item.qty_sub || 0);
          const totalLaborCost = baseLabor + extraLabor + mainStoneLabor + subStoneLabor;
          
          item.calculated_price = Math.round((goldCost + totalLaborCost) * item.quantity);
        }
      }

      // 재집계
      order.total_amount = order.items.reduce((sum, i) => {
        const sign = i.division === '판매' ? 1 : -1;
        return sum + ((i.calculated_price || 0) * sign);
      }, 0);

      const customersSnap = await getDocs(collection(db, 'customers'));
      const customerDetail = customersSnap.docs.find(d => d.id === order.customer_snapshot.customer_id)?.data() as Customer;
      const lossRate = order.customer_snapshot.loss_rate || customerDetail?.loss_rate || 0;
      const lossMultiplier = (1 + lossRate / 100);

      order.total_gold_weight_24k_g = parseFloat(order.items.reduce((sum, i) => {
        const sign = i.division === '판매' ? 1 : -1;
        const multiplier = i.material === '14K' ? (0.585 * lossMultiplier) 
                         : i.material === '18K' ? (0.750 * lossMultiplier) 
                         : 1.0;
        const wt = i.actual_weight_g !== undefined ? i.actual_weight_g : (i.estimated_weight_g || 0);
        return sum + (wt * i.quantity * multiplier * sign);
      }, 0).toFixed(3));

      // 3. 롤백된 자리에 재생성
      const batch = writeBatch(db);
      batch.set(doc(db, 'orders', orderId), order);

      if (customerDetail) {
        const customerDocRef = doc(db, 'customers', order.customer_snapshot.customer_id);
        const isWeightTrade = customerDetail.trade_type === 'weight';
        let nextAmount = customerDetail.receivable_amount;

        order.items.forEach(i => {
          const itemStatus = i.status || order.status || '접수';
          if (itemStatus !== '출고완료') return; // 출고완료된 품목만 미수 롤백/가산 대상

          const division = i.division || '판매';
          if (division !== '판매') return; // 출고완료 단계에서는 판매 품목만 롤백/가산 (결제/반품/DC는 결제완료 시에 반영)
          const itemAmount = i.calculated_price || 0;
          const baseLabor = i.labor_base || 0;
          const extraLabor = i.labor_extra || 0;
          const mainStoneLabor = (i.labor_main || 0) * (i.qty_main || 0);
          const subStoneLabor = (i.labor_sub || 0) * (i.qty_sub || 0);
          const totalLaborCost = (baseLabor + extraLabor + mainStoneLabor + subStoneLabor) * i.quantity;

          if (division === '판매') {
            if (isWeightTrade) {
              nextAmount += totalLaborCost;
            } else {
              nextAmount += itemAmount;
            }
          } else if (division === '결제' || division === '반품') {
            if (isWeightTrade) {
              nextAmount = Math.max(0, nextAmount - totalLaborCost);
            } else {
              nextAmount = Math.max(0, nextAmount - itemAmount);
            }
          } else if (division === 'DC') {
            nextAmount = Math.max(0, nextAmount - itemAmount);
          }
        });

        batch.update(customerDocRef, {
          receivable_amount: nextAmount,
          updated_at: new Date().toISOString()
        });

        if (isWeightTrade) {
          let goldDiff = 0;
          order.items.forEach((i, itemIdx) => {
            const itemStatus = i.status || order.status || '접수';
            if (itemStatus !== '출고완료') return; // 출고완료된 품목만 금 미수 롤백/가산 대상

            const division = i.division || '판매';
            if (division !== '판매') return; // 중량 정산에서도 판매 품목만 롤백/가산 (결제/반품은 결제완료 시 정산)
            const purityMultiplier = i.material === '14K' ? (0.585 * lossMultiplier) 
                                   : i.material === '18K' ? (0.750 * lossMultiplier) 
                                   : 1.0;
            const wt = i.actual_weight_g !== undefined ? i.actual_weight_g : (i.estimated_weight_g || 0);
            const itemGoldWeight24k = wt * i.quantity * purityMultiplier;
            if (itemGoldWeight24k <= 0) return;

            const txId = `TX-${orderId}-${itemIdx}`;
            const tx: GoldTransaction = {
              transaction_id: txId,
              customer_id: order.customer_snapshot.customer_id,
              type: division === '판매' ? 'out' : 'in',
              gold_type: '24K',
              weight_g: parseFloat(itemGoldWeight24k.toFixed(3)),
              note: `${division} 등록: ${orderId} (행 ${itemIdx + 1})`,
              created_at: new Date().toISOString(),
              created_by: 'system'
            };

            batch.set(doc(db, 'gold_transactions', txId), tx);
            const goldSign = division === '판매' ? 1 : -1;
            goldDiff += itemGoldWeight24k * goldSign;
          });

          const nextGold = parseFloat((customerDetail.gold_balance_24k_g + goldDiff).toFixed(3));
          batch.update(customerDocRef, {
            gold_balance_24k_g: nextGold
          });
        }
      }

      await batch.commit();
      await get().fetchDb();
    } catch (error) {
      console.error("updateItemStepWeightsAndActualWeight error: ", error);
    }
  },

  deleteOrder: async (orderId: string) => {
    try {
      const order = get().orders.find(o => o.order_id === orderId);
      if (!order) return;

      const batch = writeBatch(db);
      const customerId = order.customer_snapshot.customer_id;
      const customerDocRef = doc(db, 'customers', customerId);

      const customersSnap = await getDocs(collection(db, 'customers'));
      const customerDetail = customersSnap.docs.find(d => d.id === customerId)?.data() as Customer;

      if (customerDetail) {
        const isWeightTrade = customerDetail.trade_type === 'weight';
        let revisedGold = customerDetail.gold_balance_24k_g;
        let revisedAmount = customerDetail.receivable_amount;

        order.items.forEach(item => {
          const itemStatus = item.status || order.status || '접수';
          if (itemStatus !== '출고완료') return; // 출고완료된 품목만 미수 롤백 대상

          const division = item.division || '판매';
          if (division !== '판매') return; // 출고완료 단계에서는 판매 품목만 롤백 대상 (결제/반품/DC는 결제완료 시에만 반영되었으므로 결제완료 시에만 롤백)

          const lossRate = customerDetail.loss_rate || 0;
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
              revisedGold = Math.max(0, parseFloat((revisedGold - itemGoldWeight24k).toFixed(3)));
              revisedAmount = Math.max(0, revisedAmount - totalLaborCost);
            } else {
              revisedAmount = Math.max(0, revisedAmount - itemAmount);
            }
          }
        });

        batch.update(customerDocRef, {
          gold_balance_24k_g: revisedGold,
          receivable_amount: revisedAmount,
          updated_at: new Date().toISOString()
        });
      }

      const txSnap = await getDocs(collection(db, 'gold_transactions'));
      txSnap.docs.forEach(d => {
        const txData = d.data() as GoldTransaction;
        if (txData.note.includes(orderId)) {
          batch.delete(doc(db, 'gold_transactions', d.id));
        }
      });

      batch.delete(doc(db, 'orders', orderId));

      await batch.commit();
      await get().fetchDb();
    } catch (error) {
      console.error("deleteOrder error: ", error);
    }
  },

  deleteOrderItem: async (orderId: string, itemId: number) => {
    try {
      const order = get().orders.find(o => o.order_id === orderId);
      if (!order) return;

      const targetItem = order.items.find(i => i.item_id === itemId);
      if (!targetItem) return;

      const batch = writeBatch(db);
      const customerId = order.customer_snapshot.customer_id;
      const customerDocRef = doc(db, 'customers', customerId);

      const customerDetail = get().customers.find(c => c.customer_id === customerId);

      if (customerDetail) {
        const isWeightTrade = customerDetail.trade_type === 'weight';
        let revisedGold = customerDetail.gold_balance_24k_g;
        let revisedAmount = customerDetail.receivable_amount;

        const itemStatus = targetItem.status || order.status || '접수';
        const division = targetItem.division || '판매';

        // 1. 출고완료 상태 롤백
        if (itemStatus === '출고완료' && division === '판매') {
          const lossRate = customerDetail.loss_rate || 0;
          const lossMultiplier = (1 + lossRate / 100);
          const purityMultiplier = targetItem.material === '14K' ? (0.585 * lossMultiplier) 
                                 : targetItem.material === '18K' ? (0.750 * lossMultiplier) 
                                 : 1.0;
          
          const itemGoldWeight24k = (targetItem.estimated_weight_g || 0) * targetItem.quantity * purityMultiplier;
          const itemAmount = targetItem.calculated_price || 0;

          const baseLabor = targetItem.labor_base || 0;
          const extraLabor = targetItem.labor_extra || 0;
          const mainStoneLabor = (targetItem.labor_main || 0) * (targetItem.qty_main || 0);
          const subStoneLabor = (targetItem.labor_sub || 0) * (targetItem.qty_sub || 0);
          const totalLaborCost = (baseLabor + extraLabor + mainStoneLabor + subStoneLabor) * targetItem.quantity;

          if (isWeightTrade) {
            revisedGold = Math.max(0, parseFloat((revisedGold - itemGoldWeight24k).toFixed(3)));
            revisedAmount = Math.max(0, revisedAmount - totalLaborCost);
          } else {
            revisedAmount = Math.max(0, revisedAmount - itemAmount);
          }
        }

        // 2. 결제완료 상태 롤백
        const paymentStatus = targetItem.payment_status || '결제전';
        if (paymentStatus === '결제완료') {
          const itemAmount = targetItem.calculated_price || 0;
          const baseLabor = targetItem.labor_base || 0;
          const extraLabor = targetItem.labor_extra || 0;
          const mainStoneLabor = (targetItem.labor_main || 0) * (targetItem.qty_main || 0);
          const subStoneLabor = (targetItem.labor_sub || 0) * (targetItem.qty_sub || 0);
          const totalLaborCost = (baseLabor + extraLabor + mainStoneLabor + subStoneLabor) * targetItem.quantity;
          
          const priceVal = isWeightTrade ? totalLaborCost : itemAmount;
          
          revisedAmount = revisedAmount + priceVal;

          if (isWeightTrade && (division === '결제' || division === '반품')) {
            const lossRate = customerDetail.loss_rate || 0;
            const lossMultiplier = (1 + lossRate / 100);
            const purityMultiplier = targetItem.material === '14K' ? (0.585 * lossMultiplier) 
                                   : targetItem.material === '18K' ? (0.750 * lossMultiplier) 
                                   : 1.0;
            const wt = targetItem.actual_weight_g !== undefined ? targetItem.actual_weight_g : (targetItem.estimated_weight_g || 0);
            const itemGoldWeight24k = wt * targetItem.quantity * purityMultiplier;

            revisedGold = parseFloat(Math.max(0, revisedGold + itemGoldWeight24k).toFixed(3));
          }
        }

        batch.update(customerDocRef, {
          gold_balance_24k_g: revisedGold,
          receivable_amount: revisedAmount,
          updated_at: new Date().toISOString()
        });
      }

      // 3. 골드 트랜잭션 삭제
      const txId1 = `TX-${orderId}-${itemId}`;
      const txId2 = `TX-PAY-${orderId}-${itemId}`;
      batch.delete(doc(db, 'gold_transactions', txId1));
      batch.delete(doc(db, 'gold_transactions', txId2));

      // 4. 주문서 내 품목 리스트 수정 및 업데이트
      const nextItems = order.items.filter(i => i.item_id !== itemId);

      if (nextItems.length === 0) {
        batch.delete(doc(db, 'orders', orderId));
      } else {
        const revisedTotalAmount = nextItems.reduce((sum, i) => {
          const sign = i.division === '판매' ? 1 : -1;
          return sum + ((i.calculated_price || 0) * sign);
        }, 0);

        const customerLossRate = customerDetail?.loss_rate || 0;
        const revisedTotalGoldWeight = nextItems.reduce((sum, i) => {
          const sign = i.division === '판매' ? 1 : -1;
          const lossMultiplier = (1 + customerLossRate / 100);
          const purityMultiplier = i.material === '14K' ? (0.585 * lossMultiplier) 
                                 : i.material === '18K' ? (0.750 * lossMultiplier) 
                                 : 1.0;
          return sum + ((i.estimated_weight_g || 0) * i.quantity * purityMultiplier * sign);
        }, 0);

        batch.update(doc(db, 'orders', orderId), {
          items: nextItems,
          total_amount: revisedTotalAmount,
          total_gold_weight_24k_g: parseFloat(revisedTotalGoldWeight.toFixed(3)),
          updated_at: new Date().toISOString()
        });
      }

      await batch.commit();
      await get().fetchDb();
    } catch (error) {
      console.error("deleteOrderItem error: ", error);
    }
  },

  addGoldPayment: async (customerId: string, weightG: number, note: string) => {
    try {
      const batch = writeBatch(db);
      const txId = `TX-${new Date().getTime()}`;
      
      const newTx: GoldTransaction = {
        transaction_id: txId,
        customer_id: customerId,
        type: 'in',
        gold_type: '24K',
        weight_g: weightG,
        note: note,
        created_at: new Date().toISOString(),
        created_by: 'user'
      };

      // 1. 트랜잭션 문서 추가
      batch.set(doc(db, 'gold_transactions', txId), newTx);

      // 2. 고객 잔고 업데이트
      const customersSnap = await getDocs(collection(db, 'customers'));
      const customerDetail = customersSnap.docs.find(d => d.id === customerId)?.data() as Customer;
      
      if (customerDetail) {
        const nextGold = Math.max(0, parseFloat((customerDetail.gold_balance_24k_g - weightG).toFixed(3)));
        batch.update(doc(db, 'customers', customerId), {
          gold_balance_24k_g: nextGold,
          updated_at: new Date().toISOString()
        });
      }

      await batch.commit();
      await get().fetchDb();
    } catch (error) {
      console.error("addGoldPayment error: ", error);
    }
  },

  deleteTransaction: async (transactionId: string) => {
    try {
      const txSnap = await getDocs(collection(db, 'gold_transactions'));
      const txDoc = txSnap.docs.find(d => d.id === transactionId);
      if (!txDoc) return;

      const txData = txDoc.data() as GoldTransaction;
      const batch = writeBatch(db);

      // 1. 트랜잭션 삭제
      batch.delete(doc(db, 'gold_transactions', transactionId));

      // 2. 고객 잔고 복구
      const customersSnap = await getDocs(collection(db, 'customers'));
      const customerDetail = customersSnap.docs.find(d => d.id === txData.customer_id)?.data() as Customer;

      if (customerDetail) {
        let nextGold = customerDetail.gold_balance_24k_g;
        if (txData.type === 'in') {
          nextGold = parseFloat((nextGold + txData.weight_g).toFixed(3));
        } else {
          nextGold = Math.max(0, parseFloat((nextGold - txData.weight_g).toFixed(3)));
        }

        batch.update(doc(db, 'customers', txData.customer_id), {
          gold_balance_24k_g: nextGold,
          updated_at: new Date().toISOString()
        });
      }

      await batch.commit();
      await get().fetchDb();
    } catch (error) {
      console.error("deleteTransaction error: ", error);
    }
  }
};
});
