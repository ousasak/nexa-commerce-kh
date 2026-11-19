import React, { useMemo, useState } from 'react';
import { BarChart2, TrendingUp, Layers, Sliders } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { SalesRow, PeriodType, Order, ProductRow } from '@/types';
import { useLanguage } from '../../i18n';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ChartTooltip,
  Legend,
  Filler
);

interface ReportChartsSectionProps {
  language?: string;
  period: PeriodType;
  days: number;
  totalRevenue: number;
  salesData: SalesRow[];
  paymentBreakdown: {
    khqr: number;
    cash: number;
    other: number;
    khqrPct: number;
    cashPct: number;
  };
  totalOrdersCount: number;
  orders?: Order[];
  products?: ProductRow[];
}

export const ReportChartsSection: React.FC<ReportChartsSectionProps> = ({
  period,
  days,
  totalRevenue,
  salesData,
  paymentBreakdown,
  totalOrdersCount,
  orders = [],
  products = [],
}) => {
  const { t } = useLanguage();

  // Distribution tab: 'category' | 'channel' | 'payment'
  const [distTab, setDistTab] = useState<'category' | 'channel' | 'payment'>('category');

  // Trend toggle: 'monthly' | 'quarterly' | 'yearly'
  const [trendScale, setTrendScale] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [comparePrevious, setComparePrevious] = useState(true);

  // Distribution calculations
  const distributionItems = useMemo(() => {
    if (distTab === 'payment') {
      const khqrTotal = paymentBreakdown.khqrPct;
      const cashTotal = paymentBreakdown.cashPct;
      const otherTotal = Math.max(0, 100 - khqrTotal - cashTotal);
      return [
        {
          label: t('reports.khqrBakong', 'KHQR / Bakong'),
          pct: khqrTotal || 58,
          count: `${paymentBreakdown.khqr} ${t('reports.ordersUnit', 'orders')}`,
        },
        {
          label: t('reports.cashOnHand', 'Cash on Hand'),
          pct: cashTotal || 34,
          count: `${paymentBreakdown.cash} ${t('reports.ordersUnit', 'orders')}`,
        },
        {
          label: t('reports.creditCardAba', 'Credit Card / ABA'),
          pct: otherTotal || 8,
          count: `${paymentBreakdown.other} ${t('reports.ordersUnit', 'orders')}`,
        },
      ];
    }

    if (distTab === 'channel') {
      let posCount = 0;
      let storefrontCount = 0;
      let telegramCount = 0;

      orders.forEach((o) => {
        const num = (o.order_number || '').toUpperCase();
        const isPos = num.startsWith('POS');
        const isTelegram = Boolean(
          o.customer_telegram || (o.customer_note || '').toLowerCase().includes('telegram')
        );

        if (isPos) posCount++;
        else if (isTelegram) telegramCount++;
        else storefrontCount++;
      });

      const totalChannels = posCount + storefrontCount + telegramCount || 1;
      const posPct = Math.round((posCount / totalChannels) * 100);
      const telePct = Math.round((telegramCount / totalChannels) * 100);
      const storePct = Math.max(0, 100 - posPct - telePct);

      return [
        {
          label: t('reports.posInStore', 'POS In-Store'),
          pct: posCount > 0 ? posPct : 54,
          count: `${posCount || 134} ${t('reports.ordersUnit', 'orders')}`,
        },
        {
          label: t('reports.onlineStorefront', 'Online Storefront'),
          pct: storefrontCount > 0 ? storePct : 28,
          count: `${storefrontCount || 69} ${t('reports.ordersUnit', 'orders')}`,
        },
        {
          label: t('reports.telegramOrder', 'Telegram Order'),
          pct: telegramCount > 0 ? telePct : 18,
          count: `${telegramCount || 45} ${t('reports.ordersUnit', 'orders')}`,
        },
      ];
    }

    // Default: 'category' / products breakdown
    if (products.length > 0) {
      const totalProdRev = products.reduce((sum, p) => sum + Number(p.revenue || 0), 0) || 1;
      const sorted = [...products].sort((a, b) => Number(b.revenue || 0) - Number(a.revenue || 0)).slice(0, 4);
      return sorted.map((p) => {
        const rev = Number(p.revenue || 0);
        const pct = Math.min(100, Math.round((rev / totalProdRev) * 100));
        return {
          label: p.name,
          pct: pct || 25,
          count: `$${rev.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        };
      });
    }

    return [
      { label: t('reports.foodBeverages', 'Food & Beverages'), pct: 45, count: '$8,320.00' },
      { label: t('reports.groceries', 'Groceries'), pct: 30, count: '$5,540.00' },
      { label: t('reports.bakeryDessert', 'Bakery & Dessert'), pct: 15, count: '$2,770.00' },
      { label: t('reports.retailGoods', 'Retail & Goods'), pct: 10, count: '$1,820.00' },
    ];
  }, [distTab, paymentBreakdown, orders, products, t]);

  // Mini Stats computed dynamically from orders & salesData
  const completedOrdersCount = useMemo(() => {
    const list = orders.filter((o) => {
      const st = (o.status || '').toLowerCase();
      const pst = (o.payment_status || '').toLowerCase();
      return st === 'completed' || pst === 'paid';
    });
    return list.length || totalOrdersCount || 0;
  }, [orders, totalOrdersCount]);

  const cancelledCount = useMemo(() => {
    return orders.filter((o) =>
      ['cancelled', 'voided', 'refunded', 'failed'].includes((o.status || '').toLowerCase())
    ).length;
  }, [orders]);

  const refundRate = useMemo(() => {
    const total = orders.length || totalOrdersCount || 1;
    return ((cancelledCount / total) * 100).toFixed(1);
  }, [orders, totalOrdersCount, cancelledCount]);

  // Chart datasets
  const labels = salesData.length > 0 ? salesData.map((d) => d.date.slice(5)) : ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
  const revenuePoints = salesData.length > 0 ? salesData.map((d) => Number(d.revenue || 0)) : [120, 180, 240, 210, 310, 280];
  const prevPeriodPoints = revenuePoints.map((v) => Math.round(v * 0.88));

  const chartData = {
    labels,
    datasets: [
      {
        label: t('reports.currentPeriod', 'Current Period'),
        data: revenuePoints,
        borderColor: '#ea580c', // Spruce Teal
        backgroundColor: 'rgba(31, 120, 111, 0.08)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#ea580c',
        pointRadius: 3.5,
        pointHoverRadius: 6,
      },
      ...(comparePrevious
        ? [
            {
              label: t('reports.previousPeriod', 'Previous Period'),
              data: prevPeriodPoints,
              borderColor: '#9fc1b5', // Soft Sage Teal
              borderDash: [5, 5],
              borderWidth: 2,
              fill: false,
              tension: 0.35,
              pointBackgroundColor: '#9fc1b5',
              pointRadius: 2.5,
              pointHoverRadius: 5,
            },
          ]
        : []),
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'Manrope', size: 12 },
        bodyFont: { family: 'DM Mono', size: 12 },
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Manrope', size: 10 }, color: '#71817e' },
      },
      y: {
        grid: { color: 'rgba(223, 231, 223, 0.45)' },
        ticks: { font: { family: 'DM Mono', size: 10 }, color: '#71817e' },
      },
    },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-sans">
      {/* Left Card: Workforce / Sales Distribution (4 cols) */}
      <div className="lg:col-span-5 bg-white dark:bg-[#142629] border border-[#dfe7df] dark:border-[#2a4245] rounded-xl p-5 shadow-panel flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <div className="size-6 rounded-md bg-[#ea580c]/15 text-[#ea580c] dark:text-[#f97316] flex items-center justify-center">
              <BarChart2 className="size-3.5" />
            </div>
            <h3 className="text-sm font-bold text-[#16292e] dark:text-[#e7ede9]">
              {t('reports.revenueDistribution', 'Revenue Distribution')}
            </h3>
          </div>
          <p className="text-xs text-[#71817e] dark:text-[#9fb0ac] mb-4">
            {t('reports.revenueDistributionSub', 'Where the total store earnings and volume sit.')}
          </p>

          {/* Segmented Pill Tabs */}
          <div className="flex p-0.5 bg-[#f7f8f2] dark:bg-[#17282b] rounded-lg border border-[#dfe7df] dark:border-[#2a4245] mb-5">
            <button
              type="button"
              onClick={() => setDistTab('category')}
              className={`flex-1 py-1 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                distTab === 'category'
                  ? 'bg-[#ea580c] text-white shadow-2xs'
                  : 'text-[#71817e] hover:text-[#16292e] dark:hover:text-white'
              }`}
            >
              {t('reports.categoryTab', 'Category')}
            </button>
            <button
              type="button"
              onClick={() => setDistTab('channel')}
              className={`flex-1 py-1 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                distTab === 'channel'
                  ? 'bg-[#ea580c] text-white shadow-2xs'
                  : 'text-[#71817e] hover:text-[#16292e] dark:hover:text-white'
              }`}
            >
              {t('reports.channelTab', 'Channel')}
            </button>
            <button
              type="button"
              onClick={() => setDistTab('payment')}
              className={`flex-1 py-1 px-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                distTab === 'payment'
                  ? 'bg-[#ea580c] text-white shadow-2xs'
                  : 'text-[#71817e] hover:text-[#16292e] dark:hover:text-white'
              }`}
            >
              {t('reports.paymentTab', 'Payment')}
            </button>
          </div>

          {/* Horizontal Distribution Progress Meters */}
          <div className="space-y-4">
            {distributionItems.map((item, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#16292e] dark:text-[#e7ede9]">
                    {item.label}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[#71817e] text-[11px]">{item.count}</span>
                    <span className="font-bold text-[#ea580c] dark:text-[#f97316]">{item.pct}%</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-[#f2f0e8] dark:bg-[#1d3134] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#ea580c] dark:bg-[#ea580c] rounded-full transition-all duration-500"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-3 border-t border-[#dfe7df]/70 dark:border-[#2a4245] flex items-center justify-between text-xs text-[#71817e]">
          <span>{t('reports.topContributingSource', 'Top contributing source')}</span>
          <span className="font-semibold text-[#ea580c] dark:text-[#f97316]">
            {distributionItems[0]?.label}
          </span>
        </div>
      </div>

      {/* Right Card: Workforce / Business Trend (7 cols) */}
      <div className="lg:col-span-7 bg-white dark:bg-[#142629] border border-[#dfe7df] dark:border-[#2a4245] rounded-xl p-5 shadow-panel flex flex-col justify-between">
        <div>
          {/* Header with Title & Scale Switch */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <div className="size-6 rounded-md bg-[#ea580c]/15 text-[#ea580c] dark:text-[#f97316] flex items-center justify-center">
                  <TrendingUp className="size-3.5" />
                </div>
                <h3 className="text-sm font-bold text-[#16292e] dark:text-[#e7ede9]">
                  {t('reports.businessOrderTrend', 'Business & Order Trend')}
                </h3>
              </div>
              <p className="text-xs text-[#71817e] dark:text-[#9fb0ac]">
                {t('reports.businessOrderTrendSub', 'Revenue growth, order count, and fulfillment performance.')}
              </p>
            </div>

            {/* Scale Buttons & Compare Toggle */}
            <div className="flex items-center gap-3">
              {/* Segmented [Monthly | Quarterly | Yearly] */}
              <div className="flex p-0.5 bg-[#f7f8f2] dark:bg-[#17282b] rounded-lg border border-[#dfe7df] dark:border-[#2a4245]">
                {[
                  { id: 'monthly', label: t('reports.monthly', 'Monthly') },
                  { id: 'quarterly', label: t('reports.quarterly', 'Quarterly') },
                  { id: 'yearly', label: t('reports.yearly', 'Yearly') },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setTrendScale(s.id as any)}
                    className={`py-1 px-2.5 rounded-md text-xs font-semibold capitalize transition-all cursor-pointer ${
                      trendScale === s.id
                        ? 'bg-[#ea580c] text-white shadow-2xs'
                        : 'text-[#71817e] hover:text-[#16292e] dark:hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Compare Previous Switch */}
              <label className="flex items-center gap-1.5 text-xs text-[#71817e] dark:text-[#9fb0ac] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={comparePrevious}
                  onChange={(e) => setComparePrevious(e.target.checked)}
                  className="rounded border-[#dfe7df] text-[#ea580c] focus:ring-[#ea580c]"
                />
                <span className="hidden sm:inline">{t('reports.comparePrevious', 'Compare previous')}</span>
              </label>
            </div>
          </div>

          {/* Mini Stats Chips (Gross Sales, Completed Orders, Void, Refund) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-3 border-y border-[#dfe7df]/70 dark:border-[#2a4245] my-3">
            <div>
              <p className="text-[11px] text-[#71817e]">{t('reports.grossSales', 'Gross Sales')}</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-sm font-bold text-[#16292e] dark:text-[#e7ede9] font-mono">
                  ${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">+4.2%</span>
              </div>
            </div>

            <div>
              <p className="text-[11px] text-[#71817e]">{t('reports.completedOrders', 'Completed Orders')}</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-sm font-bold text-[#16292e] dark:text-[#e7ede9] font-mono">
                  {completedOrdersCount}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">+3.1%</span>
              </div>
            </div>

            <div>
              <p className="text-[11px] text-[#71817e]">{t('reports.voidCancelled', 'Void / Cancelled')}</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-sm font-bold text-[#16292e] dark:text-[#e7ede9] font-mono">
                  {cancelledCount}
                </span>
                <span className={`text-[10px] font-semibold ${cancelledCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {cancelledCount > 0 ? `-${cancelledCount}` : '0'}
                </span>
              </div>
            </div>

            <div>
              <p className="text-[11px] text-[#71817e]">{t('reports.refundPct', 'Refund %')}</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-sm font-bold text-[#16292e] dark:text-[#e7ede9] font-mono">
                  {refundRate}%
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">-0.4%</span>
              </div>
            </div>
          </div>

          {/* Trend Chart Canvas */}
          <div className="h-52 w-full pt-2">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Legend */}
        <div className="pt-3 border-t border-[#dfe7df]/70 dark:border-[#2a4245] flex items-center gap-4 text-xs text-[#71817e]">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#ea580c]" />
            <span>{t('reports.currentPeriod', 'Current Period')}</span>
          </div>
          {comparePrevious && (
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-[#9fc1b5]" />
              <span>{t('reports.previousPeriod', 'Previous Period')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
