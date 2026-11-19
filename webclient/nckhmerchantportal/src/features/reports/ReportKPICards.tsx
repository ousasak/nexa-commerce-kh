import React, { useMemo } from 'react';
import {
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingBag,
  CreditCard,
  Percent,
} from 'lucide-react';
import { useLanguage } from '../../i18n';

interface ReportKPICardsProps {
  language?: string;
  totalRevenue: number;
  totalOrders: number;
  estimatedCost: number;
  estimatedGrossProfit: number;
  profitMarginPercent: number;
  avgOrderValue: number;
  days: number;
  growthRate?: number;
  orderGrowthRate?: number;
  fulfillmentRate?: number;
  stockUtilization?: number;
  returnRefundRate?: number;
}

export const ReportKPICards: React.FC<ReportKPICardsProps> = ({
  totalRevenue,
  totalOrders,
  estimatedCost,
  estimatedGrossProfit,
  profitMarginPercent,
  avgOrderValue,
  days,
  growthRate = 4.2,
  orderGrowthRate = 3.1,
  fulfillmentRate = 96.4,
  stockUtilization = 68,
  returnRefundRate = 1.8,
}) => {
  const { t, isKhmer } = useLanguage();

  const formatCurrency = (val: number) => {
    return `$${val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const isGrowthPos = growthRate >= 0;
  const isOrderGrowthPos = orderGrowthRate >= 0;

  // Comparison period dates with dual language support
  const formatMonth = (d: Date) => {
    if (isKhmer) {
      const khMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
      return `ខែ${khMonths[d.getMonth()]} ${d.getFullYear()}`;
    }
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const currentMonth = useMemo(() => formatMonth(new Date()), [isKhmer]);
  const prevMonth = useMemo(() => {
    const prevDate = new Date();
    prevDate.setMonth(prevDate.getMonth() - 1);
    return formatMonth(prevDate);
  }, [isKhmer]);

  return (
    <div className="bg-white dark:bg-[#142629] border border-[#dfe7df] dark:border-[#2a4245] rounded-xl p-5 shadow-panel font-sans">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#dfe7df]/70 dark:border-[#2a4245]">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-md bg-[#ea580c]/15 text-[#ea580c] dark:text-[#f97316] flex items-center justify-center">
            <Users className="size-3.5" />
          </div>
          <h2 className="text-sm font-bold text-[#16292e] dark:text-[#e7ede9]">
            {t('reports.businessSummary', 'Business Report Summary')}
          </h2>
        </div>
        <div className="text-xs text-[#71817e] dark:text-[#9fb0ac] font-medium font-mono">
          <span>{currentMonth}</span>
          <span className="mx-1.5">•</span>
          <span>{t('reports.vs', 'Vs')} {prevMonth}</span>
        </div>
      </div>

      {/* 6 Column KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6 pt-4">
        {/* Metric 1: Total Revenue */}
        <div className="space-y-1">
          <p className="text-xs text-[#71817e] dark:text-[#9fb0ac] font-medium">
            {t('reports.totalRevenue', 'Total Revenue')}
          </p>
          <p className="text-2xl sm:text-[26px] font-bold text-[#16292e] dark:text-[#e7ede9] tracking-tight leading-none">
            {formatCurrency(totalRevenue)}
          </p>
          <div className={`flex items-center gap-1 text-[11px] font-medium pt-1 ${
            isGrowthPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {isGrowthPos ? <TrendingUp className="size-3 stroke-[2.5]" /> : <TrendingDown className="size-3 stroke-[2.5]" />}
            <span>{isGrowthPos ? '+' : ''}{growthRate.toFixed(1)}% {t('reports.vsLastMonthShort', 'vs last month')}</span>
          </div>
        </div>

        {/* Metric 2: Active Orders */}
        <div className="space-y-1 sm:border-l sm:border-[#dfe7df]/70 sm:dark:border-[#2a4245] sm:pl-4">
          <p className="text-xs text-[#71817e] dark:text-[#9fb0ac] font-medium">
            {t('reports.totalOrders', 'Total Orders')}
          </p>
          <p className="text-2xl sm:text-[26px] font-bold text-[#16292e] dark:text-[#e7ede9] tracking-tight leading-none">
            {totalOrders}
          </p>
          <div className={`flex items-center gap-1 text-[11px] font-medium pt-1 ${
            isOrderGrowthPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {isOrderGrowthPos ? <TrendingUp className="size-3 stroke-[2.5]" /> : <TrendingDown className="size-3 stroke-[2.5]" />}
            <span>{isOrderGrowthPos ? '+' : ''}{orderGrowthRate.toFixed(1)}% {t('reports.vsLastMonthShort', 'vs last month')}</span>
          </div>
        </div>

        {/* Metric 3: Fulfillment Rate */}
        <div className="space-y-1 md:border-l md:border-[#dfe7df]/70 md:dark:border-[#2a4245] md:pl-4">
          <p className="text-xs text-[#71817e] dark:text-[#9fb0ac] font-medium">
            {t('reports.fulfillmentRate', 'Fulfillment Rate')}
          </p>
          <p className="text-2xl sm:text-[26px] font-bold text-[#16292e] dark:text-[#e7ede9] tracking-tight leading-none">
            {fulfillmentRate.toFixed(1)}%
          </p>
          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 pt-1">
            <TrendingUp className="size-3 stroke-[2.5]" />
            <span>+0.6% {t('reports.vsLastMonthShort', 'vs last month')}</span>
          </div>
        </div>

        {/* Metric 4: Stock Utilization */}
        <div className="space-y-1 xl:border-l xl:border-[#dfe7df]/70 xl:dark:border-[#2a4245] xl:pl-4">
          <p className="text-xs text-[#71817e] dark:text-[#9fb0ac] font-medium">
            {t('reports.stockUtilization', 'Stock Utilization')}
          </p>
          <p className="text-2xl sm:text-[26px] font-bold text-[#16292e] dark:text-[#e7ede9] tracking-tight leading-none">
            {stockUtilization.toFixed(0)}%
          </p>
          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 pt-1">
            <TrendingUp className="size-3 stroke-[2.5]" />
            <span>+5.4% {t('reports.vsLastMonthShort', 'vs last month')}</span>
          </div>
        </div>

        {/* Metric 5: Average Order Value */}
        <div className="space-y-1 xl:border-l xl:border-[#dfe7df]/70 xl:dark:border-[#2a4245] xl:pl-4">
          <p className="text-xs text-[#71817e] dark:text-[#9fb0ac] font-medium">
            {t('reports.avgOrderValue', 'Avg Order Value')}
          </p>
          <p className="text-2xl sm:text-[26px] font-bold text-[#16292e] dark:text-[#e7ede9] tracking-tight leading-none">
            {formatCurrency(avgOrderValue)}
          </p>
          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 pt-1">
            <TrendingUp className="size-3 stroke-[2.5]" />
            <span>+$0.85 {t('reports.vsLastMonthShort', 'vs last month')}</span>
          </div>
        </div>

        {/* Metric 6: Return Rate */}
        <div className="space-y-1 xl:border-l xl:border-[#dfe7df]/70 xl:dark:border-[#2a4245] xl:pl-4">
          <p className="text-xs text-[#71817e] dark:text-[#9fb0ac] font-medium">
            {t('reports.returnRefundRate', 'Return / Refund Rate')}
          </p>
          <p className="text-2xl sm:text-[26px] font-bold text-[#16292e] dark:text-[#e7ede9] tracking-tight leading-none">
            {returnRefundRate.toFixed(1)}%
          </p>
          <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 pt-1">
            <TrendingDown className="size-3 stroke-[2.5]" />
            <span>-0.4% {t('reports.vsLastMonthShort', 'vs last month')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
