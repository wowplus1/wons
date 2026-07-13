// src/components/Statistics.tsx
import React, { useMemo, useState } from 'react';
import { useErpStore } from '../store/useErpStore';
import { 
  BarChart3, 
  DollarSign, 
  Gem, 
  Download, 
  Users, 
  Package, 
  Percent 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend
} from 'recharts';
import * as XLSX from 'xlsx';

// ── KST(한국 표준시, UTC+9) 기준 날짜 유틸 ──
// 브라우저 로컬 타임존과 무관하게 항상 한국 날짜를 반환한다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
/** KST 기준 오늘 'YYYY-MM-DD' (i일 전으로 이동 가능). */
const kstDateStr = (offsetDays = 0): string =>
  new Date(Date.now() + KST_OFFSET_MS - offsetDays * 86400000).toISOString().substring(0, 10);
/** 주문/출고 날짜값을 KST 'YYYY-MM-DD' 로 정규화. 이미 YYYY-MM-DD 면 그대로(사용자 입력 출고일), ISO 타임스탬프면 KST 날짜로 변환. */
const toKstDate = (v?: string | number | Date | null): string => {
  if (v === undefined || v === null || v === '') return '';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return typeof v === 'string' ? v.substring(0, 10) : '';
  return new Date(d.getTime() + KST_OFFSET_MS).toISOString().substring(0, 10);
};

export const Statistics: React.FC = () => {
  const { orders, customers, catalog, totalReceivable, totalGoldBalance24k, currentRates, setActiveTab } = useErpStore();

  // 필터 상태
  const [periodType, setPeriodType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [onlyReleased, setOnlyReleased] = useState<boolean>(true);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [selectedDivision, setSelectedDivision] = useState<string>('전체');

  // 직접선택용 날짜 설정 (기본값: 한국시간 오늘 기준 최근 30일)
  const todayStr = useMemo(() => kstDateStr(0), []);
  const monthAgoStr = useMemo(() => kstDateStr(30), []);
  const [startDate, setStartDate] = useState<string>(monthAgoStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  const isRateMissingToday = useMemo(() => {
    if (!currentRates) return true;
    return currentRates.date !== todayStr;
  }, [currentRates, todayStr]);

  const handleFullBackupExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. 거래처 데이터
      const customersData = customers.map(c => ({
        '거래처 ID': c.customer_id,
        '상호명': c.name,
        '거래처 코드': c.code,
        '등급': `${c.grade}등급`,
        '대표자명': c.owner_name || '',
        '전화번호': c.phone || '',
        '핸드폰': c.mobile || '',
        '해리적용율(%)': c.loss_rate,
        '거래구분': c.trade_type === 'weight' ? '중량거래' : '시세거래',
        '사업자 번호': c.business_number || '',
        '순금 미수 잔고(g)': c.gold_balance_24k_g,
        '미수 잔고 금액(원)': c.receivable_amount,
        '비고': c.note || '',
        '생성일자': c.created_at || '',
        '수정일자': c.updated_at || ''
      }));
      const wsCustomers = XLSX.utils.json_to_sheet(customersData);
      XLSX.utils.book_append_sheet(wb, wsCustomers, '거래처 목록');

      // 2. 주문/명세서 목록
      const ordersData: any[] = [];
      orders.forEach(o => {
        const items = o.items || [];
        items.forEach((item, idx) => {
          ordersData.push({
            '주문번호': o.order_id,
            '주문일자': o.order_date,
            '거래처': o.customer_snapshot.name,
            '품목 인덱스': idx + 1,
            '구분': item.division || o.division || '판매',
            '모델번호': item.model_number || '',
            '재질': item.material || '',
            '색상': item.color || '',
            '사이즈': item.size || '',
            '비고': item.note || '',
            '메인스톤': item.stone_main_id || '',
            '메인스톤 수량': item.qty_main || 0,
            '보조스톤': item.stone_sub_id || '',
            '보조스톤 수량': item.qty_sub || 0,
            '수량': item.quantity,
            '기본공임': item.labor_base || 0,
            '추가공임': item.labor_extra || 0,
            '스톤공임': item.labor_stone_total || 0,
            '판매총액': item.calculated_price || 0,
            '진행단계': item.status || o.status || '접수',
            '결제상태': item.payment_status || '결제전',
            '출고일자': item.release_date || ''
          });
        });
      });
      const wsOrders = XLSX.utils.json_to_sheet(ordersData);
      XLSX.utils.book_append_sheet(wb, wsOrders, '주문 및 품목 내역');

      // 3. 골드 트랜잭션 (수금 대장 등)
      const { transactions } = useErpStore.getState();
      const txData = (transactions || []).map(t => {
        const c = customers.find(cust => cust.customer_id === t.customer_id);
        return {
          '거래 ID': t.transaction_id,
          '거래처명': c ? c.name : t.customer_id,
          '구분': t.type === 'in' ? '입고(차감)' : '출고(가산)',
          '금타입': t.gold_type,
          '중량(g)': t.weight_g,
          '비고': t.note || '',
          '생성자': t.created_by || '',
          '등록일시': t.created_at
        };
      });
      const wsTx = XLSX.utils.json_to_sheet(txData);
      XLSX.utils.book_append_sheet(wb, wsTx, '골드 수금 내역');

      // 4. 금 시세
      const ratesData = currentRates ? [{
        '기준 일자': currentRates.date,
        '24K 매입(돈)': currentRates.buy_rates.gold_24k_per_don,
        '24K 매도(돈)': currentRates.sell_rates.gold_24k_per_don,
        '18K 매입(g)': currentRates.buy_rates.gold_18k_per_g,
        '18K 매도(g)': currentRates.sell_rates.gold_18k_per_g,
        '14K 매입(g)': currentRates.buy_rates.gold_14k_per_g,
        '14K 매도(g)': currentRates.sell_rates.gold_14k_per_g,
        '업데이트 일시': currentRates.updated_at
      }] : [];
      const wsRates = XLSX.utils.json_to_sheet(ratesData);
      XLSX.utils.book_append_sheet(wb, wsRates, '당일 금시세');

      // 5. 상품 카탈로그
      const catalogData = catalog.map(item => ({
        '모델 번호': item.model_number,
        '세트 여부': item.is_set ? 'Y' : 'N',
        '기준 재질': item.materials.join(', '),
        '기본 중량(g)': item.base_weight || 0,
        '기본 공임비': item.base_labor_fees ? JSON.stringify(item.base_labor_fees) : '',
        '스톤 차감 중량(g)': item.manual_deduction_weight || 0,
        '추가 공임비': item.extra_labor_fee || 0,
        '등록일자': item.created_at || ''
      }));
      const wsCatalog = XLSX.utils.json_to_sheet(catalogData);
      XLSX.utils.book_append_sheet(wb, wsCatalog, '상품 카탈로그');

      // 6. 스톤 단가 마스터
      const { stones } = useErpStore.getState();
      const stonesData = stones.map(s => ({
        '스톤 ID': s.stone_id,
        '스톤 이름': s.name,
        '모양': s.shape,
        '사이즈': s.size,
        '중량(Carat)': s.weight_carat,
        '차감중량': s.deduction_weight || 0,
        '매입단가': s.purchase_price || 0,
        '1등단가': s.grade_prices.grade_1 || 0,
        '2등단가': s.grade_prices.grade_2 || 0,
        '3등단가': s.grade_prices.grade_3 || 0,
        '4등단가': s.grade_prices.grade_4 || 0,
        '비고': s.note || '',
        '등록일시': s.updated_at
      }));
      const wsStones = XLSX.utils.json_to_sheet(stonesData);
      XLSX.utils.book_append_sheet(wb, wsStones, '스톤 마스터');

      // 엑셀 내보내기 실행
      XLSX.writeFile(wb, `원스쥬얼리_ERP_통합백업_${todayStr}.xlsx`);
      alert('전체 데이터 데이터베이스(DB) 통합 백업 엑셀 다운로드가 성공하였습니다. 안전한 곳에 저장해 주십시오.');
    } catch (err) {
      console.error(err);
      alert('백업 도중 오류가 발생했습니다: ' + String(err));
    }
  };

  // ISO 주차 계산 헬퍼
  const getISOWeek = (dateStr: string) => {
    if (!dateStr) return '';
    // KST 날짜 문자열을 UTC 자정으로 파싱하고 UTC 메서드로 계산 → 타임존 영향 제거
    const date = new Date(String(dateStr).substring(0, 10) + 'T00:00:00Z');
    if (isNaN(date.getTime())) return '';
    const tempDate = new Date(date.valueOf());
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - (tempDate.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${tempDate.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  // 날짜 범위 배열 생성 헬퍼 (모두 한국시간 KST 기준)
  const getDailyRange = () => {
    const arr = [];
    for (let i = 29; i >= 0; i--) arr.push(kstDateStr(i));
    return arr;
  };

  const getWeeklyRange = () => {
    const arr = [];
    for (let i = 11; i >= 0; i--) arr.push(getISOWeek(kstDateStr(i * 7)));
    return Array.from(new Set(arr)).slice(-12);
  };

  const getMonthlyRange = () => {
    const arr = [];
    const kstNow = kstDateStr(0); // 'YYYY-MM-DD' (KST)
    const y = parseInt(kstNow.substring(0, 4), 10);
    const m = parseInt(kstNow.substring(5, 7), 10) - 1; // 0-indexed
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(y, m - i, 1));
      arr.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    }
    return arr;
  };

  const getCustomRange = (start: string, end: string) => {
    if (!start || !end) return [];
    const arr = [];
    // UTC 자정으로 파싱 + UTC 증가 → 브라우저 타임존 영향 제거
    const curr = new Date(start.substring(0, 10) + 'T00:00:00Z');
    const e = new Date(end.substring(0, 10) + 'T00:00:00Z');
    let limit = 0;
    while (curr <= e && limit < 366) {
      arr.push(curr.toISOString().substring(0, 10));
      curr.setUTCDate(curr.getUTCDate() + 1);
      limit++;
    }
    return arr;
  };

  // 1. 기간별 집계 및 차트 데이터 가공
  const chartData = useMemo(() => {
    let range: string[] = [];
    if (periodType === 'daily') {
      range = getDailyRange();
    } else if (periodType === 'weekly') {
      range = getWeeklyRange();
    } else if (periodType === 'monthly') {
      range = getMonthlyRange();
    } else if (periodType === 'custom') {
      range = getCustomRange(startDate, endDate);
    }

    const aggMap: { [key: string]: { label: string; revenue: number; quantity: number; goldWeight: number; laborCost: number; unpaidRevenue: number } } = {};
    range.forEach(r => {
      aggMap[r] = { label: r, revenue: 0, quantity: 0, goldWeight: 0, laborCost: 0, unpaidRevenue: 0 };
    });

    orders.forEach(order => {
      if (!order.items) return;

      const customerDetail = customers.find(c => c.customer_id === order.customer_snapshot.customer_id);
      const lossRate = order.customer_snapshot.loss_rate || customerDetail?.loss_rate || 0;
      const lossMultiplier = (1 + lossRate / 100);

      order.items.forEach(item => {
        const itemStatus = item.status || order.status || '접수';
        if (onlyReleased && itemStatus !== '출고완료') return;

        const paymentStatus = item.payment_status || '결제전';
        if (paymentFilter === 'paid' && paymentStatus !== '결제완료') return;
        if (paymentFilter === 'unpaid' && paymentStatus !== '결제전') return;

        const division = item.division || '판매';
        if (selectedDivision !== '전체' && division !== selectedDivision) return;
        if (division === '결제') return; // 단순 입금은 매출에서 배제

        const dateStr = toKstDate(item.release_date || order.order_date || '');
        if (!dateStr) return;

        let key = '';
        if (periodType === 'daily' || periodType === 'custom') {
          key = dateStr;
        } else if (periodType === 'weekly') {
          key = getISOWeek(dateStr);
        } else if (periodType === 'monthly') {
          key = dateStr.substring(0, 7);
        }

        if (aggMap[key] !== undefined) {
          const price = item.calculated_price || 0;
          const sign = (division === '판매') ? 1 : -1;

          const purityMultiplier = item.material === '14K' ? (0.585 * lossMultiplier) 
                                 : item.material === '18K' ? (0.750 * lossMultiplier) 
                                 : 1.0;
          const wt = item.actual_weight_g !== undefined ? item.actual_weight_g : (item.estimated_weight_g || 0);
          const goldWeight24k = wt * item.quantity * purityMultiplier;

          const baseLabor = item.labor_base || 0;
          const extraLabor = item.labor_extra || 0;
          const stoneLabor = item.labor_stone_total !== undefined ? item.labor_stone_total : ((item.labor_main || 0) * (item.qty_main || 0) + (item.labor_sub || 0) * (item.qty_sub || 0));
          const totalLaborCost = baseLabor + extraLabor + stoneLabor;

          aggMap[key].revenue += price * sign;
          aggMap[key].quantity += item.quantity * sign;
          aggMap[key].goldWeight += goldWeight24k * sign;
          aggMap[key].laborCost += totalLaborCost * item.quantity * sign;
          if (paymentStatus !== '결제완료') {
            aggMap[key].unpaidRevenue += price * sign;
          }
        }
      });
    });

    return range.map(r => aggMap[r]);
  }, [orders, customers, periodType, startDate, endDate, onlyReleased, paymentFilter, selectedDivision]);

  // 2. 전체 요약 데이터 (KPI)
  const totalSummary = useMemo(() => {
    let revenue = 0;
    let quantity = 0;
    let goldWeight = 0;
    let laborCost = 0;
    let unpaidRevenue = 0;

    chartData.forEach(d => {
      revenue += d.revenue;
      quantity += d.quantity;
      goldWeight += d.goldWeight;
      laborCost += d.laborCost;
      unpaidRevenue += d.unpaidRevenue;
    });

    return { revenue, quantity, goldWeight, laborCost, unpaidRevenue };
  }, [chartData]);

  // 3. 거래처별 매출 순위 TOP 10
  const customerRanking = useMemo(() => {
    const map: { [id: string]: { name: string; revenue: number; quantity: number; goldWeight: number; receivableAmount: number; goldBalance24k: number } } = {};

    orders.forEach(order => {
      if (!order.items) return;
      const custId = order.customer_snapshot.customer_id;
      const custName = order.customer_snapshot.name;

      const customerDetail = customers.find(c => c.customer_id === custId);
      const lossRate = order.customer_snapshot.loss_rate || customerDetail?.loss_rate || 0;
      const lossMultiplier = (1 + lossRate / 100);

      if (!map[custId]) {
        map[custId] = { 
          name: custName, 
          revenue: 0, 
          quantity: 0, 
          goldWeight: 0,
          receivableAmount: customerDetail?.receivable_amount || 0,
          goldBalance24k: customerDetail?.gold_balance_24k_g || 0
        };
      }

      order.items.forEach(item => {
        const itemStatus = item.status || order.status || '접수';
        if (onlyReleased && itemStatus !== '출고완료') return;

        const paymentStatus = item.payment_status || '결제전';
        if (paymentFilter === 'paid' && paymentStatus !== '결제완료') return;
        if (paymentFilter === 'unpaid' && paymentStatus !== '결제전') return;

        const division = item.division || '판매';
        if (selectedDivision !== '전체' && division !== selectedDivision) return;
        if (division === '결제') return;

        const dateStr = toKstDate(item.release_date || order.order_date || '');
        if (periodType === 'custom') {
          if (dateStr < startDate || dateStr > endDate) return;
        } else if (periodType === 'daily') {
          const dailyRange = getDailyRange();
          if (!dailyRange.includes(dateStr)) return;
        } else if (periodType === 'weekly') {
          const weeklyRange = getWeeklyRange();
          if (!weeklyRange.includes(getISOWeek(dateStr))) return;
        } else if (periodType === 'monthly') {
          const monthlyRange = getMonthlyRange();
          if (!monthlyRange.includes(dateStr.substring(0, 7))) return;
        }

        const price = item.calculated_price || 0;
        const sign = (division === '판매') ? 1 : -1;

        const purityMultiplier = item.material === '14K' ? (0.585 * lossMultiplier) 
                               : item.material === '18K' ? (0.750 * lossMultiplier) 
                               : 1.0;
        const wt = item.actual_weight_g !== undefined ? item.actual_weight_g : (item.estimated_weight_g || 0);
        const goldWeight24k = wt * item.quantity * purityMultiplier;

        map[custId].revenue += price * sign;
        map[custId].quantity += item.quantity * sign;
        map[custId].goldWeight += goldWeight24k * sign;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [orders, customers, periodType, startDate, endDate, onlyReleased, paymentFilter, selectedDivision]);

  // 4. 상품별 판매량 순위 TOP 10
  const catalogRanking = useMemo(() => {
    const map: { [model: string]: { model_number: string; category: string; revenue: number; quantity: number } } = {};

    orders.forEach(order => {
      if (!order.items) return;

      order.items.forEach(item => {
        const model = item.model_number || '기타/직접입력';

        const itemStatus = item.status || order.status || '접수';
        if (onlyReleased && itemStatus !== '출고완료') return;

        const paymentStatus = item.payment_status || '결제전';
        if (paymentFilter === 'paid' && paymentStatus !== '결제완료') return;
        if (paymentFilter === 'unpaid' && paymentStatus !== '결제전') return;

        const division = item.division || '판매';
        if (selectedDivision !== '전체' && division !== selectedDivision) return;
        if (division === '결제') return;

        const dateStr = toKstDate(item.release_date || order.order_date || '');
        if (periodType === 'custom') {
          if (dateStr < startDate || dateStr > endDate) return;
        } else if (periodType === 'daily') {
          const dailyRange = getDailyRange();
          if (!dailyRange.includes(dateStr)) return;
        } else if (periodType === 'weekly') {
          const weeklyRange = getWeeklyRange();
          if (!weeklyRange.includes(getISOWeek(dateStr))) return;
        } else if (periodType === 'monthly') {
          const monthlyRange = getMonthlyRange();
          if (!monthlyRange.includes(dateStr.substring(0, 7))) return;
        }

        const price = item.calculated_price || 0;
        const sign = (division === '판매') ? 1 : -1;

        if (!map[model]) {
          const catItem = catalog.find(c => c.model_number === model);
          const category = catItem?.category || '미분류';
          map[model] = { model_number: model, category, revenue: 0, quantity: 0 };
        }

        map[model].revenue += price * sign;
        map[model].quantity += item.quantity * sign;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [orders, catalog, periodType, startDate, endDate, onlyReleased, paymentFilter, selectedDivision]);

  // 5. 다중 시트 엑셀 파일 다운로드
  const handleDownloadExcel = () => {
    const wb = XLSX.utils.book_new();

    // 시트 1: 기간별 매출 추이
    const trendData = chartData.map(d => ({
      '기간': d.label,
      '매출액 (원)': d.revenue,
      '판매수량 (개)': d.quantity,
      '순금중량 (g)': Number(d.goldWeight.toFixed(3)),
      '공임비 (원)': d.laborCost,
      '기간내 미수 발생액 (원)': d.unpaidRevenue
    }));
    const ws1 = XLSX.utils.json_to_sheet(trendData);
    XLSX.utils.book_append_sheet(wb, ws1, '기간별 매출 추이');

    // 시트 2: 거래처 매출 순위
    const custRankData = customerRanking.map((c, idx) => ({
      '순위': idx + 1,
      '거래처명': c.name,
      '총 매출액 (원)': c.revenue,
      '총 판매수량 (개)': c.quantity,
      '총 순금중량 (g)': Number(c.goldWeight.toFixed(3)),
      '현재 미수금 잔액 (원)': c.receivableAmount,
      '현재 순금미수 잔액 (g)': Number(c.goldBalance24k.toFixed(3))
    }));
    const ws2 = XLSX.utils.json_to_sheet(custRankData);
    XLSX.utils.book_append_sheet(wb, ws2, '거래처별 매출 순위');

    // 시트 3: 상품별 판매 순위
    const itemRankData = catalogRanking.map((c, idx) => ({
      '순위': idx + 1,
      '모델번호': c.model_number,
      '카테고리': c.category,
      '총 판매수량 (개)': c.quantity,
      '총 매출액 (원)': c.revenue
    }));
    const ws3 = XLSX.utils.json_to_sheet(itemRankData);
    XLSX.utils.book_append_sheet(wb, ws3, '상품별 판매 순위');

    XLSX.writeFile(wb, `원스쥬얼리_ERP_통계분석_${periodType}_${todayStr}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }} className="animate-fade-in">
      
      {/* ⚠️ 오늘자 금 시세 미입력 알림 경고 배너 */}
      {isRateMissingToday && (
        <div 
          className="glass-panel" 
          style={{ 
            padding: '12px 20px', 
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.25) 100%)', 
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderLeft: '5px solid #ef4444',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <h3 style={{ fontSize: '15px', color: 'var(--text-main)', fontWeight: '600', margin: 0 }}>
              오늘자({todayStr}) 실시간 금 시세가 아직 등록되지 않았습니다. 정확한 정산을 위해 금 시세를 등록해 주십시오.
            </h3>
          </div>
          <button 
            onClick={() => setActiveTab('rates')} 
            className="btn-primary" 
            style={{ 
              fontSize: '14px', 
              padding: '6px 14px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#fff',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            시세 등록하러 가기 ➡️
          </button>
        </div>
      )}

      {/* 타이틀 및 엑셀 다운로드 바 */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '16px 20px', 
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, var(--bg-surface-solid) 100%)', 
          borderLeft: '4px solid var(--primary)',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BarChart3 style={{ color: 'var(--primary)' }} size={22} />
          <h3 style={{ fontSize: '20px', color: 'var(--text-main)', margin: 0, fontWeight: '700' }}>
            통계 분석
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleFullBackupExcel}
            className="btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)',
              border: 'none',
              color: '#000',
              fontWeight: '700',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.2)'
            }}
          >
            <Download size={15} /> 전체 데이터 백업 (DB 통합)
          </button>
          <button
            onClick={handleDownloadExcel}
            className="btn-primary"
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              color: '#fff',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
            }}
          >
            <Download size={15} /> 엑셀 내보내기 (통계)
          </button>
        </div>
      </div>

      {/* 필터 섹션 */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '16px 20px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '16px',
          background: 'var(--bg-surface)'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}>
          {/* 집계 기준 선택 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>집계 기준</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['daily', 'weekly', 'monthly', 'custom'] as const).map(type => {
                const labelMap = { daily: '일별', weekly: '주간별', monthly: '월별', custom: '기간선택' };
                return (
                  <button
                    key={type}
                    onClick={() => setPeriodType(type)}
                    className="btn-primary"
                    style={{
                      padding: '5px 12px',
                      fontSize: '13px',
                      boxShadow: 'none',
                      background: periodType === type ? 'var(--primary)' : 'transparent',
                      color: periodType === type ? '#000' : 'var(--text-muted)',
                      border: `1px solid ${periodType === type ? 'var(--primary)' : 'var(--border-color)'}`,
                      borderRadius: '4px'
                    }}
                  >
                    {labelMap[type]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 직접 날짜 선택 */}
          {periodType === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>날짜 범위</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
                <span style={{ color: 'var(--text-muted)' }}>~</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}
                />
              </div>
            </div>
          )}

          {/* 구분 필터 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>구분(수지)</span>
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              style={{
                padding: '5px 12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                borderRadius: '4px',
                fontSize: '13px',
                minWidth: '90px'
              }}
            >
              {['전체', '판매', '반품', 'DC'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* 결제 구분 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>결제 상태</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              style={{
                padding: '5px 12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                borderRadius: '4px',
                fontSize: '13px',
                minWidth: '100px'
              }}
            >
              <option value="all">전체 내역</option>
              <option value="paid">결제 완료</option>
              <option value="unpaid">결제 대기</option>
            </select>
          </div>

          {/* 출고 조건 토글 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-end', height: '34px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)' }}>
              <input
                type="checkbox"
                checked={onlyReleased}
                onChange={(e) => setOnlyReleased(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              출고완료 품목만 통계 포함
            </label>
          </div>
        </div>
      </div>

      {/* 대시보드 상단 요약 카드 (KPI Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        
        {/* 카드 1: 총 매출액 */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' }}>
              <DollarSign size={18} />
            </div>
            <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: '600' }}>총 매출액 (실적)</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--font-title)', color: 'var(--text-main)', marginTop: '4px' }}>
            {totalSummary.revenue.toLocaleString()} 원
          </div>
        </div>

        {/* 카드 2: 총 공임비 */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Percent size={18} />
            </div>
            <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: '600' }}>총 공임비 합계</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--font-title)', color: '#3b82f6', marginTop: '4px' }}>
            {totalSummary.laborCost.toLocaleString()} 원
          </div>
        </div>

        {/* 카드 3: 총 판매수량 */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <Package size={18} />
            </div>
            <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: '600' }}>총 판매 수량</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--font-title)', color: '#10b981', marginTop: '4px' }}>
            {totalSummary.quantity.toLocaleString()} 개
          </div>
        </div>

        {/* 카드 4: 총 순금중량 */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <Gem size={18} />
            </div>
            <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: '600' }}>총 순금 중량 (24K 환산)</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '700', fontFamily: 'var(--font-title)', color: '#ef4444', marginTop: '4px' }}>
            {Number(totalSummary.goldWeight.toFixed(3))} g
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '6px', fontWeight: 'normal' }}>
              ({(totalSummary.goldWeight / 3.75).toFixed(2)} 돈)
            </span>
          </div>
        </div>

        {/* 카드 5: 기간 내 미수 발생 */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(217, 119, 6, 0.1)', color: 'var(--warning)' }}>
              <DollarSign size={18} />
            </div>
            <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: '600' }}>기간 내 미수 발생액</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--font-title)', color: 'var(--warning)', marginTop: '4px' }}>
            {totalSummary.unpaidRevenue.toLocaleString()} 원
          </div>
        </div>

        {/* 카드 6: 실시간 누적 미수금 */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '20px', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(220, 38, 38, 0.1)', color: 'var(--danger)' }}>
              <DollarSign size={18} />
            </div>
            <span style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: '600' }}>실시간 누적 미수금</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--font-title)', color: 'var(--danger)', marginTop: '2px' }}>
            {totalReceivable.toLocaleString()} 원
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            순금미수: <strong style={{ color: 'var(--primary)' }}>{Number(totalGoldBalance24k.toFixed(3))} g</strong> ({(totalGoldBalance24k / 3.75).toFixed(2)}돈)
          </div>
        </div>

      </div>

      {/* 차트 섹션 (2중 축 그래프) */}
      <div 
        className="glass-panel" 
        style={{ 
          padding: '24px', 
          background: 'var(--bg-surface)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '16px', color: 'var(--text-main)', margin: 0, fontWeight: '600' }}>매출액 & 수량 분석 트렌드</h4>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>* 반품 및 DC 구분을 차감 처리한 실제 수치입니다.</span>
        </div>
        
        <div style={{ width: '100%', height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorQuantity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis 
                dataKey="label" 
                stroke="var(--text-muted)" 
                fontSize={12} 
                tickLine={false} 
              />
              <YAxis 
                yAxisId="left"
                stroke="var(--primary)" 
                fontSize={12}
                tickFormatter={(val) => `${(val / 10000).toLocaleString()}만`}
                tickLine={false}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#10b981" 
                fontSize={12}
                tickFormatter={(val) => `${val}개`}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  background: 'var(--bg-surface-solid)', 
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-main)'
                }} 
                formatter={(value: any, name: any) => {
                  if (name === '매출액') return [`${value.toLocaleString()} 원`, name];
                  if (name === '판매량') return [`${value.toLocaleString()} 개`, name];
                  return [value, name];
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Area 
                yAxisId="left"
                type="monotone" 
                dataKey="revenue" 
                name="매출액" 
                stroke="var(--primary)" 
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
                strokeWidth={2}
              />
              <Area 
                yAxisId="right"
                type="monotone" 
                dataKey="quantity" 
                name="판매량" 
                stroke="#10b981" 
                fillOpacity={1} 
                fill="url(#colorQuantity)" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2단 랭킹 분석 표 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '16px' }}>
        
        {/* 거래처별 매출 순위 */}
        <div className="glass-panel" style={{ padding: '20px', background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Users size={16} style={{ color: 'var(--primary)' }} />
            <h4 style={{ fontSize: '16px', color: 'var(--text-main)', margin: 0, fontWeight: '600' }}>
              거래처 매출 기여도 순위 (TOP 10)
            </h4>
          </div>
          {customerRanking.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '30px' }}>
              조건에 맞는 거래처 통계 데이터가 없습니다.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px', textAlign: 'center', width: '50px' }}>순위</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>거래처명</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>판매수량</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>순금중량</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: 'var(--primary)' }}>총 매출액</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: 'var(--danger)' }}>현재 미수금</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: 'var(--primary)' }}>현재 순금미수</th>
                  </tr>
                </thead>
                <tbody>
                  {customerRanking.map((cust, idx) => (
                    <tr key={cust.name} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: idx < 3 ? 'var(--primary)' : 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '8px', fontWeight: '500' }}>{cust.name}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{cust.quantity.toLocaleString()} 개</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{Number(cust.goldWeight.toFixed(2))} g</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>{cust.revenue.toLocaleString()} 원</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: 'var(--danger)' }}>{cust.receivableAmount.toLocaleString()} 원</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>{Number(cust.goldBalance24k.toFixed(2))} g</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 상품(모델)별 판매 순위 */}
        <div className="glass-panel" style={{ padding: '20px', background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Package size={16} style={{ color: '#10b981' }} />
            <h4 style={{ fontSize: '16px', color: 'var(--text-main)', margin: 0, fontWeight: '600' }}>
              인기 상품 모델 판매량 순위 (TOP 10)
            </h4>
          </div>
          {catalogRanking.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '30px' }}>
              조건에 맞는 상품 통계 데이터가 없습니다.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px', textAlign: 'center', width: '50px' }}>순위</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>모델 번호</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>카테고리</th>
                    <th style={{ padding: '8px', textAlign: 'right', color: '#10b981' }}>판매수량</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>총 매출액</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogRanking.map((item, idx) => (
                    <tr key={item.model_number} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: idx < 3 ? '#10b981' : 'var(--text-muted)' }}>{idx + 1}</td>
                      <td style={{ padding: '8px', fontWeight: '500' }}>{item.model_number}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ 
                          padding: '2px 6px', 
                          background: 'rgba(43, 41, 39, 0.05)', 
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: 'var(--text-muted)'
                        }}>
                          {item.category}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#10b981' }}>{item.quantity.toLocaleString()} 개</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{item.revenue.toLocaleString()} 원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
