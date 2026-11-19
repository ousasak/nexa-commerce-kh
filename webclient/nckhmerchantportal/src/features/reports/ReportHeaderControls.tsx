import React, { useState, useMemo } from 'react';
import toast from '../../utils/toast';
import {
  Download,
  Printer,
  ChevronDown,
  Send,
  Home,
  RefreshCw,
  RotateCcw,
  Check,
  Calendar,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { PeriodType } from '@/types';
import { useLanguage } from '../../i18n';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';

interface ReportHeaderControlsProps {
  language?: string;
  days: number;
  setDays: (d: number) => void;
  period: PeriodType;
  setPeriod: (p: PeriodType) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onExportCsv: () => void;
  onPrint: () => void;
  onOpenTelegramModal?: () => void;
  recordCount?: number;
  selectedCategory?: string;
  setSelectedCategory?: (c: string) => void;
  selectedChannel?: string;
  setSelectedChannel?: (ch: string) => void;
  selectedPayment?: string;
  setSelectedPayment?: (p: string) => void;
  comparison?: string;
  setComparison?: (comp: string) => void;
  onApplyFilters?: () => void;
  onResetFilters?: () => void;
}

export const ReportHeaderControls: React.FC<ReportHeaderControlsProps> = ({
  days,
  setDays,
  period,
  setPeriod,
  refreshing,
  onRefresh,
  onExportCsv,
  onPrint,
  onOpenTelegramModal,
  recordCount = 248,
  selectedCategory: propCategory,
  setSelectedCategory: propSetCategory,
  selectedChannel: propChannel,
  setSelectedChannel: propSetChannel,
  selectedPayment: propPayment,
  setSelectedPayment: propSetPayment,
  comparison: propComparison,
  setComparison: propSetComparison,
  onApplyFilters,
  onResetFilters,
}) => {
  const { t, isKhmer } = useLanguage();

  // Internal fallback filter states
  const [localComparison, setLocalComparison] = useState('last_month');
  const [localCategory, setLocalCategory] = useState('all');
  const [localChannel, setLocalChannel] = useState('all');
  const [localPayment, setLocalPayment] = useState('all');

  const activeComparison = propComparison ?? localComparison;
  const setComparison = propSetComparison ?? setLocalComparison;

  const activeCategory = propCategory ?? localCategory;
  const setSelectedCategory = propSetCategory ?? setLocalCategory;

  const activeChannel = propChannel ?? localChannel;
  const setSelectedChannel = propSetChannel ?? setLocalChannel;

  const activePayment = propPayment ?? localPayment;
  const setSelectedPayment = propSetPayment ?? setLocalPayment;

  // Options with dual language
  const comparisonOptions = [
    { key: 'last_month', label: t('reports.vsLastMonth', 'vs Last Month') },
    { key: 'last_week', label: t('reports.vsLastWeek', 'vs Last Week') },
    { key: 'last_year', label: t('reports.vsLastYear', 'vs Last Year') },
    { key: 'prev_period', label: t('reports.vsPrevPeriod', 'vs Previous Period') },
  ];

  const categoryOptions = [
    { key: 'all', label: t('reports.allCategories', 'All Categories') },
    { key: 'food', label: t('reports.foodBeverages', 'Food & Beverages') },
    { key: 'bakery', label: t('reports.bakeryDessert', 'Bakery & Dessert') },
    { key: 'groceries', label: t('reports.groceries', 'Groceries') },
    { key: 'retail', label: t('reports.retailGoods', 'Retail & Goods') },
  ];

  const channelOptions = [
    { key: 'all', label: t('reports.allChannels', 'All Channels') },
    { key: 'pos', label: t('reports.posInStore', 'POS In-Store') },
    { key: 'storefront', label: t('reports.onlineStorefront', 'Online Storefront') },
    { key: 'telegram', label: t('reports.telegramOrder', 'Telegram Order') },
    { key: 'delivery', label: t('reports.deliveryPartner', 'Delivery Partner') },
  ];

  const paymentOptions = [
    { key: 'all', label: t('reports.allPaymentTypes', 'All Payment Types') },
    { key: 'khqr', label: t('reports.khqrBakong', 'KHQR / Bakong') },
    { key: 'cash', label: t('reports.cashOnHand', 'Cash on Hand') },
    { key: 'card', label: t('reports.creditCardAba', 'Credit Card / ABA') },
  ];

  const currentComparisonLabel =
    comparisonOptions.find((c) => c.key === activeComparison)?.label || t('reports.vsLastMonth', 'vs Last Month');
  const currentCategoryLabel =
    categoryOptions.find((c) => c.key === activeCategory)?.label || t('reports.allCategories', 'All Categories');
  const currentChannelLabel =
    channelOptions.find((ch) => ch.key === activeChannel)?.label || t('reports.allChannels', 'All Channels');
  const currentPaymentLabel =
    paymentOptions.find((p) => p.key === activePayment)?.label || t('reports.allPaymentTypes', 'All Payment Types');

  // Localized Month & Year Label
  const currentMonthLabel = useMemo(() => {
    const d = new Date();
    if (isKhmer) {
      const khMonths = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'];
      return `ខែ${khMonths[d.getMonth()]} ឆ្នាំ${d.getFullYear()}`;
    }
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [isKhmer]);

  const handleApply = () => {
    if (onApplyFilters) {
      onApplyFilters();
    } else {
      onRefresh();
    }
  };

  const handleReset = () => {
    setComparison('last_month');
    setSelectedCategory('all');
    setSelectedChannel('all');
    setSelectedPayment('all');
    if (onResetFilters) {
      onResetFilters();
    } else {
      onRefresh();
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Top Breadcrumb & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Breadcrumb */}
        <Breadcrumbs />

        {/* Right Top Actions */}
        <div className="flex items-center gap-2">
          {/* Date Selector Pill Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-10 px-3.5 rounded-xl border border-[#dfe7df] dark:border-[#2a4245] bg-white dark:bg-[#142629] text-[#16292e] dark:text-[#e7ede9] text-sm font-semibold flex items-center gap-2 shadow-2xs hover:bg-[#f7f8f2] dark:hover:bg-[#17282b] transition-colors cursor-pointer"
              >
                <Calendar className="size-4 text-[#ea580c]" />
                <span>{currentMonthLabel}</span>
                <ChevronDown className="size-3.5 text-[#71817e]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-sm font-sans p-1.5 rounded-xl border-[#dfe7df] dark:border-[#2a4245]">
              {([1, 7, 30, 90] as const).map((d) => (
                <DropdownMenuItem
                  key={d}
                  onClick={() => setDays(d)}
                  className="cursor-pointer px-3 py-2 rounded-lg hover:bg-[#fff7ed] dark:hover:bg-[#1d3134]"
                >
                  {d === 1
                    ? t('reports.today24h', 'Today (24h)')
                    : t('reports.pastDaysDropdown', { count: d, defaultValue: `Past ${d} Days` })}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-10 px-3.5 rounded-xl border border-[#dfe7df] dark:border-[#2a4245] bg-white dark:bg-[#142629] text-[#16292e] dark:text-[#e7ede9] text-sm font-semibold flex items-center gap-2 shadow-2xs hover:bg-[#f7f8f2] dark:hover:bg-[#17282b] transition-colors cursor-pointer"
              >
                <Download className="size-4 text-[#71817e]" />
                <span>{t('reports.export', 'Export')}</span>
                <ChevronDown className="size-3.5 text-[#71817e]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 text-sm font-sans p-1.5 rounded-xl border-[#dfe7df] dark:border-[#2a4245]">
              <DropdownMenuItem
                onClick={onExportCsv}
                className="cursor-pointer py-2 hover:bg-[#fff7ed] dark:hover:bg-[#1d3134]"
              >
                <Download className="size-4 text-[#ea580c] mr-2" />
                <span>{t('reports.exportCsv', 'Export as CSV')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#dfe7df] dark:bg-[#2a4245]" />
              <DropdownMenuItem
                onClick={onPrint}
                className="cursor-pointer py-2 hover:bg-[#fff7ed] dark:hover:bg-[#1d3134]"
              >
                <Printer className="size-4 text-[#ea580c] mr-2" />
                <span>{t('reports.printDocument', 'Print Document')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Telegram Bot Button */}
          {onOpenTelegramModal && (
            <button
              type="button"
              onClick={onOpenTelegramModal}
              className="h-10 px-3.5 rounded-xl bg-[#ea580c]/10 hover:bg-[#ea580c]/20 border border-[#ea580c]/30 text-[#ea580c] dark:text-[#f97316] text-sm font-semibold flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
              title={t('reports.telegramReport', 'Telegram Report')}
            >
              <Send className="size-4" />
              <span className="hidden md:inline">{t('reports.telegramReport', 'Telegram Report')}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Page Title & Description */}
      <div>
        <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-[#16292e] dark:text-[#e7ede9] leading-tight font-heading">
          {t('reports.title', 'Business Reports')}
        </h1>
        <p className="text-xs sm:text-[13px] text-[#71817e] dark:text-[#9fb0ac] mt-1 max-w-2xl">
          {t(
            'reports.subtitle',
            'Analyze total revenue, estimated profit margins, inventory health, and top customers.'
          )}
        </p>
      </div>

      {/* 3. Filter Bar (Pill selects, Apply, Reset, Save View, Live Status) */}
      <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
        {/* Comparison Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-10 px-3.5 rounded-xl border border-[#dfe7df] dark:border-[#2a4245] bg-white dark:bg-[#142629] text-[#16292e] dark:text-[#e7ede9] text-sm font-semibold flex items-center gap-2 shadow-2xs hover:bg-[#f7f8f2] transition-colors cursor-pointer"
            >
              <span>{currentComparisonLabel}</span>
              <ChevronDown className="size-3.5 text-[#71817e]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 text-sm p-1.5 rounded-xl border-[#dfe7df] dark:border-[#2a4245]">
            {comparisonOptions.map((item) => (
              <DropdownMenuItem
                key={item.key}
                onClick={() => setComparison(item.key)}
                className="cursor-pointer px-3 py-2 rounded-lg"
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Category Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-10 px-3.5 rounded-xl border border-[#dfe7df] dark:border-[#2a4245] bg-white dark:bg-[#142629] text-[#16292e] dark:text-[#e7ede9] text-sm font-semibold flex items-center gap-2 shadow-2xs hover:bg-[#f7f8f2] transition-colors cursor-pointer"
            >
              <span>{currentCategoryLabel}</span>
              <ChevronDown className="size-3.5 text-[#71817e]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-52 text-sm p-1.5 rounded-xl border-[#dfe7df] dark:border-[#2a4245]">
            {categoryOptions.map((c) => (
              <DropdownMenuItem
                key={c.key}
                onClick={() => setSelectedCategory(c.key)}
                className="cursor-pointer px-3 py-2 rounded-lg"
              >
                {c.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Channel Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-10 px-3.5 rounded-xl border border-[#dfe7df] dark:border-[#2a4245] bg-white dark:bg-[#142629] text-[#16292e] dark:text-[#e7ede9] text-sm font-semibold flex items-center gap-2 shadow-2xs hover:bg-[#f7f8f2] transition-colors cursor-pointer"
            >
              <span>{currentChannelLabel}</span>
              <ChevronDown className="size-3.5 text-[#71817e]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48 text-sm p-1.5 rounded-xl border-[#dfe7df] dark:border-[#2a4245]">
            {channelOptions.map((ch) => (
              <DropdownMenuItem
                key={ch.key}
                onClick={() => setSelectedChannel(ch.key)}
                className="cursor-pointer px-3 py-2 rounded-lg"
              >
                {ch.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Payment Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="h-10 px-3.5 rounded-xl border border-[#dfe7df] dark:border-[#2a4245] bg-white dark:bg-[#142629] text-[#16292e] dark:text-[#e7ede9] text-sm font-semibold flex items-center gap-2 shadow-2xs hover:bg-[#f7f8f2] transition-colors cursor-pointer"
            >
              <span>{currentPaymentLabel}</span>
              <ChevronDown className="size-3.5 text-[#71817e]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-52 text-sm p-1.5 rounded-xl border-[#dfe7df] dark:border-[#2a4245]">
            {paymentOptions.map((p) => (
              <DropdownMenuItem
                key={p.key}
                onClick={() => setSelectedPayment(p.key)}
                className="cursor-pointer px-3 py-2 rounded-lg"
              >
                {p.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Apply Button */}
        <button
          type="button"
          onClick={handleApply}
          className="h-10 px-4.5 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] text-white text-sm font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
        >
          <Check className="size-4 stroke-[2.5]" />
          <span>{t('buttons.apply', t('common.apply', 'Apply'))}</span>
        </button>

        {/* Reset Button */}
        <button
          type="button"
          onClick={handleReset}
          className="h-10 px-3.5 rounded-xl border border-[#dfe7df] dark:border-[#2a4245] bg-[#f7f8f2] dark:bg-[#17282b] hover:bg-[#edf2ec] dark:hover:bg-[#203437] text-[#16292e] dark:text-[#e7ede9] text-sm font-semibold flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
        >
          <RotateCcw className="size-3.5 text-[#71817e] dark:text-[#9fb0ac]" />
          <span>{t('buttons.reset', t('common.reset', 'Reset'))}</span>
        </button>

        {/* Live Records Status Pill */}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-[#71817e] dark:text-[#9fb0ac] bg-white dark:bg-[#142629] border border-[#dfe7df] dark:border-[#2a4245] px-2.5 py-1 rounded-full shadow-2xs font-mono">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{t('reports.live', 'Live')}</span>
          <span className="text-[#a3aeab]">•</span>
          <span>{t('reports.recordsCount', { count: recordCount, defaultValue: `${recordCount} Records` })}</span>
        </div>
      </div>
    </div>
  );
};
