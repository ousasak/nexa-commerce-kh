import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from '../../utils/toast';
import {
  Search,
  ChevronDown,
  ArrowUpDown,
  Plus,
  Minus,
  Bell,
  Package,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal,
  Edit2,
  Sliders,
  Check,
} from 'lucide-react';
import { stockService } from '../../services/stockService';
import { fullUrl } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../i18n';
import { Loading, Modal, Button } from '../../components/ui';
import { DataTableViewOptions, Pagination, Breadcrumbs } from '../../components/common';
import { localizeCategoryName } from '../categories/category.types';

interface StockProduct {
  id: number | string;
  name: string;
  category_name?: string;
  quantity: number;
  price?: number;
  images?: string[] | string;
  image?: string;
  thumbnail?: string;
  [key: string]: any;
}

const getProductImage = (p?: StockProduct | null): string => {
  if (!p) return '/images/default-product.svg';
  const rawImages: any = p.images;
  if (Array.isArray(rawImages) && rawImages.length > 0 && typeof rawImages[0] === 'string' && rawImages[0].trim()) {
    return fullUrl(rawImages[0]);
  }
  if (typeof rawImages === 'string' && rawImages.trim()) {
    try {
      const parsed = JSON.parse(rawImages);
      if (Array.isArray(parsed) && parsed[0]) return fullUrl(parsed[0]);
    } catch {}
    return fullUrl(rawImages);
  }
  if (typeof p.image === 'string' && p.image.trim()) {
    return fullUrl(p.image);
  }
  if (typeof p.thumbnail === 'string' && p.thumbnail.trim()) {
    return fullUrl(p.thumbnail);
  }
  return '/images/default-product.svg';
};

const GROUP_META: Record<
  string,
  {
    key: string;
    border: string;
    iconBg: string;
    iconColor: string;
    pillClass: string;
    countColor: string;
  }
> = {
  out_of_stock: {
    key: 'outOfStock',
    border: 'border-rose-500',
    iconBg: 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60',
    iconColor: 'text-rose-600 dark:text-rose-400',
    pillClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800',
    countColor: 'text-rose-600 dark:text-rose-400',
  },
  low_stock: {
    key: 'lowStock',
    border: 'border-amber-500',
    iconBg: 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60',
    iconColor: 'text-amber-600 dark:text-amber-400',
    pillClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800',
    countColor: 'text-amber-600 dark:text-amber-400',
  },
  normal: {
    key: 'inStock',
    border: 'border-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    pillClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800',
    countColor: 'text-emerald-600 dark:text-emerald-400',
  },
  high_stock: {
    key: 'highStock',
    border: 'border-sky-500',
    iconBg: 'bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-800/60',
    iconColor: 'text-sky-600 dark:text-sky-400',
    pillClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/80 dark:border-blue-800',
    countColor: 'text-sky-600 dark:text-sky-400',
  },
};

const ORDER_GROUPS = ['out_of_stock', 'low_stock', 'normal', 'high_stock'];

export default function StockPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [low, setLow] = useState<number | string>(5);
  const [high, setHigh] = useState<number | string>(50);
  const [sending, setSending] = useState(false);
  const [stockModal, setStockModal] = useState<{
    product: StockProduct;
    qty: number | string;
    mode: 'add' | 'set';
  } | null>(null);

  // Tab & Filters
  const [tab, setTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    category: true,
    stock: true,
    status: true,
  });

  const toggleColumn = (id: string) => {
    setVisibleColumns((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Sorting
  const [sortAsc, setSortAsc] = useState(true);
  const [sortField, setSortField] = useState<'index' | 'name' | 'stock'>('index');

  // Actions Dropdown
  const [openDropdownId, setOpenDropdownId] = useState<number | string | null>(null);

  const load = (l = Number(low) || 0, h = Number(high) || 0) => {
    if (!user?.shop_id) return;
    setLoading(true);
    stockService
      .getStockReport(user.shop_id, l, h)
      .then(setReport)
      .catch((err) => {
        toast.error(err?.response?.data?.detail || t('stock.loadFailed', 'Failed to load stock report'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [user?.shop_id]);

  useEffect(() => {
    setPage(1);
  }, [tab, search, pageSize]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.action-dropdown-container')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const applyThresholds = () => {
    const l = Math.max(0, Number(low) || 0);
    const h = Math.max(1, Number(high) || 1);
    setLow(l);
    setHigh(h);
    load(l, h);
  };

  const openAddModal = (product: StockProduct) =>
    setStockModal({ product, qty: 1, mode: 'add' });
  const openSetModal = (product: StockProduct) =>
    setStockModal({ product, qty: product.quantity || 0, mode: 'set' });

  const saveStock = async () => {
    if (!stockModal) return;
    try {
      const qtyNumber = Number(stockModal.qty) || 0;
      const res = await stockService.updateStock(
        stockModal.product.id,
        qtyNumber,
        stockModal.mode
      );
      toast.success(
        `${t('stock.updateSuccess', 'Stock updated successfully')} → ${res.quantity}`
      );
      setStockModal(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || t('stock.updateFailed', 'Failed to update stock'));
    }
  };

  const alertTelegram = async () => {
    if (!user?.shop_id) return;
    setSending(true);
    try {
      const res = await stockService.sendStockAlert(user.shop_id);
      toast.success(
        res?.detail || t('stock.alertSent', 'Stock alert sent!')
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || t('stock.alertFailed', 'Failed to send alert'));
    } finally {
      setSending(false);
    }
  };

  const groups = report?.groups || {};
  const counts = report?.counts || {};

  const allProducts: StockProduct[] = useMemo(() => {
    return [
      ...(groups.out_of_stock || []),
      ...(groups.low_stock || []),
      ...(groups.normal || []),
      ...(groups.high_stock || []),
    ];
  }, [groups]);

  const currentTabProducts: StockProduct[] =
    tab === 'all' ? allProducts : groups[tab] || [];
  const totalProductsCount = report?.total_products ?? allProducts.length;

  // Filtered & Sorted items
  const filteredData = useMemo(() => {
    let list = currentTabProducts.filter((p) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.category_name || '').toLowerCase().includes(q) ||
        String(p.id).includes(q)
      );
    });

    list.sort((a, b) => {
      if (sortField === 'name') {
        return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (sortField === 'stock') {
        const qtyA = a.quantity ?? 0;
        const qtyB = b.quantity ?? 0;
        return sortAsc ? qtyA - qtyB : qtyB - qtyA;
      }
      // default 'index'
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      return sortAsc ? idA - idB : idB - idA;
    });

    return list;
  }, [currentTabProducts, search, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, page, pageSize]);

  if (loading && allProducts.length === 0) return <Loading />;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <Breadcrumbs />

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t('stock.title', 'Stock Management')}
          </h1>
          <p className="text-xs text-slate-500">
            {t('stock.subtitle', 'Track and adjust inventory levels across all product tiers.')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs shadow-panel">
            <span className="font-semibold text-slate-500">
              {t('stock.lowThreshold', 'Low ≤')}
            </span>
            <input
              value={low}
              onChange={(e) => setLow(e.target.value)}
              className="w-8 text-center font-bold font-mono bg-transparent border-b border-slate-300 dark:border-slate-700 focus:outline-none focus:border-orange-500 text-xs text-slate-800 dark:text-slate-100"
            />
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="font-semibold text-slate-500">
              {t('stock.highThreshold', 'High ≥')}
            </span>
            <input
              value={high}
              onChange={(e) => setHigh(e.target.value)}
              className="w-8 text-center font-bold font-mono bg-transparent border-b border-slate-300 dark:border-slate-700 focus:outline-none focus:border-orange-500 text-xs text-slate-800 dark:text-slate-100"
            />
            <button
              onClick={applyThresholds}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline ml-1 cursor-pointer"
            >
              {t('stock.apply', t('buttons.apply', 'Apply'))}
            </button>
          </div>

          <button
            type="button"
            onClick={alertTelegram}
            disabled={sending}
            className="h-9 px-3.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Bell className="size-3.5" />
            <span>{sending ? t('stock.sending', 'Sending...') : t('stock.telegramAlert', 'Telegram Alert')}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards (SmartHR Design Pattern) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {ORDER_GROUPS.map((k) => {
          const meta = GROUP_META[k];
          const isActive = tab === k;
          return (
            <div
              key={k}
              onClick={() => setTab(tab === k ? 'all' : k)}
              className={`p-3.5 sm:p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-panel cursor-pointer transition-all ${
                isActive
                  ? 'border-orange-500 ring-2 ring-orange-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-orange-400/50'
              }`}
            >
              {/* Top Row: Icon + Status Pill */}
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${meta.iconBg} ${meta.iconColor}`}
                >
                  {k === 'out_of_stock' ? (
                    <AlertTriangle className="size-5" />
                  ) : k === 'normal' ? (
                    <CheckCircle className="size-5" />
                  ) : (
                    <Package className="size-5" />
                  )}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md whitespace-nowrap ${meta.pillClass}`}>
                  {t(`stock.${meta.key}`)}
                </span>
              </div>

              {/* Count + Subtitle */}
              <div className="text-2xl font-bold font-mono text-[#16292e] dark:text-[#e7ede9]">
                {counts[k] ?? 0}
              </div>
              <p className="text-xs text-[#71817e] font-medium mt-0.5 truncate">
                {t(`stock.${meta.key}`)}
              </p>
            </div>
          );
        })}
      </div>

      {/* SmartHR Employee Table Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-panel font-sans">
        {/* Search Input */}
        <div className="relative w-full sm:w-64 md:w-72">
          <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t('stock.searchPlaceholder', 'Search stock items...')}
            className="h-10 sm:h-10.5 w-full pl-10 pr-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
          />
        </div>

        {/* Group / Stock Tier Dropdown */}
        <div className="relative">
          <select
            value={tab}
            onChange={(e) => {
              setTab(e.target.value);
              setPage(1);
            }}
            className="h-10 sm:h-10.5 pl-3.5 pr-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 appearance-none cursor-pointer focus:outline-none focus:border-orange-500 transition-all"
          >
            <option value="all">
              {t('stock.all', 'All')} ({totalProductsCount})
            </option>
            {ORDER_GROUPS.map((k) => (
              <option key={k} value={k}>
                {t(`stock.${GROUP_META[k].key}`)} ({counts[k] ?? 0})
              </option>
            ))}
          </select>
          <ChevronDown className="size-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Apply Button */}
        <button
          type="button"
          onClick={() => {
            load();
            setPage(1);
          }}
          style={{
            backgroundColor: 'var(--btn-primary-hex, var(--primary-hex, #ec4899))',
          }}
          className="h-10 sm:h-10.5 px-4.5 rounded-xl hover:brightness-90 text-white text-sm font-bold inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
        >
          <Check className="size-4 stroke-[2.5]" />
          <span>{t('buttons.apply', t('stock.apply', 'Apply'))}</span>
        </button>

        {/* Reset Button */}
        <button
          type="button"
          onClick={() => {
            setSearch('');
            setTab('all');
            setPage(1);
          }}
          className="h-10 sm:h-10.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-95 shadow-2xs"
        >
          {t('buttons.reset', t('stock.reset', 'Reset'))}
        </button>

        {/* View / Column Visibility Toggle */}
        <div className="ml-auto">
          <DataTableViewOptions
            columns={[
              { id: 'category', label: t('tables.category', t('stock.category', 'Category')), visible: visibleColumns.category },
              { id: 'stock', label: t('tables.currentStock', t('stock.currentStock', 'Current Stock')), visible: visibleColumns.stock },
              { id: 'status', label: t('tables.status', t('stock.status', 'Status')), visible: visibleColumns.status },
            ]}
            onToggleColumn={toggleColumn}
          />
        </div>
      </div>

      {/* RestroPOS Stock Table Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-panel overflow-hidden font-sans">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-wider bg-slate-50/90 dark:bg-slate-800/90">
                {/* Index Sort */}
                <th
                  onClick={() => {
                    if (sortField === 'index') {
                      setSortAsc(!sortAsc);
                    } else {
                      setSortField('index');
                      setSortAsc(true);
                    }
                  }}
                  className="py-3.5 px-4 w-12 cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>#</span>
                    <ArrowUpDown className="size-3 text-slate-400" />
                  </div>
                </th>

                {/* Product Name */}
                <th
                  onClick={() => {
                    if (sortField === 'name') {
                      setSortAsc(!sortAsc);
                    } else {
                      setSortField('name');
                      setSortAsc(true);
                    }
                  }}
                  className="py-3.5 px-4 min-w-[200px] cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>{t('tables.products', t('stock.product', 'Product'))}</span>
                    {sortField === 'name' && <ArrowUpDown className="size-3 text-orange-600" />}
                  </div>
                </th>

                {/* Category */}
                {visibleColumns.category && (
                  <th className="py-3.5 px-4 whitespace-nowrap">
                    {t('tables.category', t('stock.category', 'Category'))}
                  </th>
                )}

                {/* Current Stock */}
                {visibleColumns.stock && (
                  <th
                    onClick={() => {
                      if (sortField === 'stock') {
                        setSortAsc(!sortAsc);
                      } else {
                        setSortField('stock');
                        setSortAsc(true);
                      }
                    }}
                    className="py-3.5 px-4 text-center cursor-pointer select-none hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>{t('tables.currentStock', t('stock.currentStock', 'Current Stock'))}</span>
                      {sortField === 'stock' && <ArrowUpDown className="size-3 text-orange-600" />}
                    </div>
                  </th>
                )}

                {/* Status */}
                {visibleColumns.status && (
                  <th className="py-3.5 px-4 text-center w-32 whitespace-nowrap">
                    {t('tables.status', t('stock.status', 'Status'))}
                  </th>
                )}

                {/* Actions */}
                <th className="py-3.5 px-4 w-16 text-right whitespace-nowrap font-medium text-slate-500 dark:text-slate-400">
                  {t('tables.actions', t('stock.actions', 'Actions'))}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800">
              {paginatedData.map((p, idx) => {
                const rowNum = (page - 1) * pageSize + idx + 1;
                const isDropdownOpen = openDropdownId === p.id;
                let meta = GROUP_META.normal;
                if (p.quantity <= 0) {
                  meta = GROUP_META.out_of_stock;
                } else if (p.quantity <= Number(low)) {
                  meta = GROUP_META.low_stock;
                } else if (p.quantity >= Number(high)) {
                  meta = GROUP_META.high_stock;
                }

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* Index Number */}
                    <td className="py-3.5 px-4 font-medium text-slate-400 text-xs">
                      {rowNum}
                    </td>

                    {/* Product Name + Image Thumbnail */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                          <img
                            src={getProductImage(p)}
                            alt={p.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = '/images/default-product.svg';
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {p.name}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {t('stock.id', 'ID')}: #{p.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    {visibleColumns.category && (
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-md font-medium">
                          {p.category_name ? localizeCategoryName(p.category_name, language === 'kh', true) : '—'}
                        </span>
                      </td>
                    )}

                    {/* Current Stock */}
                    {visibleColumns.stock && (
                      <td className="py-3.5 px-4 text-center font-bold font-mono text-slate-900 dark:text-white whitespace-nowrap">
                        {p.quantity}
                      </td>
                    )}

                    {/* Status Badge */}
                    {visibleColumns.status && (
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${meta.pillClass}`}
                        >
                          {t(`stock.${meta.key}`)}
                        </span>
                      </td>
                    )}

                    {/* Three-dots Action Menu */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="relative inline-flex items-center justify-end action-dropdown-container">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenDropdownId(isDropdownOpen ? null : p.id)
                          }
                          title={t('stock.moreOptions', t('common.more', 'More Options'))}
                          className={`size-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer active:scale-95 ${
                            isDropdownOpen
                              ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs'
                          }`}
                        >
                          <MoreHorizontal className="size-4.5" />
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                          <div className="absolute right-0 top-10.5 z-30 w-48 py-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-100 font-sans text-left">
                            <button
                              type="button"
                              onClick={() => {
                                setOpenDropdownId(null);
                                openAddModal(p);
                              }}
                              className="w-full px-3.5 py-2 text-sm text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
                            >
                              <Plus className="size-4" />
                              <span>{t('stock.addStock', 'Add Stock')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setOpenDropdownId(null);
                                openSetModal(p);
                              }}
                              className="w-full px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
                            >
                              <Sliders className="size-4 text-slate-400" />
                              <span>{t('stock.setStock', 'Set Stock')}</span>
                            </button>

                            <div className="my-1 border-t border-slate-100 dark:border-slate-700/60" />

                            <Link
                              to={`/products/${p.id}/edit`}
                              onClick={() => setOpenDropdownId(null)}
                              className="w-full px-3.5 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
                            >
                              <Edit2 className="size-4 text-slate-400" />
                              <span>{t('stock.editProduct', 'Edit Product')}</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedData.length === 0 && (
                <tr>
                  <td
                    colSpan={3 + Object.values(visibleColumns).filter(Boolean).length}
                    className="py-12 text-center text-slate-400 text-sm"
                  >
                    {search
                      ? t('stock.noMatchTitle', 'No items match your search')
                      : t('stock.emptyCategory', 'No products in this group')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Standardized SmartHR Pagination Footer */}
        {filteredData.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={filteredData.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            itemLabel={t('stock.items', 'items')}
          />
        )}
      </div>

      {/* Add / Set Stock Modal */}
      <Modal
        open={!!stockModal}
        size="md"
        className="sm:max-w-[480px] overflow-hidden"
        title={
          stockModal?.mode === 'add'
            ? t('stock.addStock', 'Add Stock')
            : t('stock.setStock', 'Set Stock')
        }
        subtitle={stockModal?.product?.name ? `${stockModal.product.name} (ID: #${stockModal.product.id})` : undefined}
        icon={
          <div className="size-full rounded-xl overflow-hidden flex items-center justify-center bg-white dark:bg-slate-800">
            <img
              src={getProductImage(stockModal?.product)}
              alt={stockModal?.product?.name || 'Product'}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/images/default-product.svg';
              }}
            />
          </div>
        }
        iconVariant={stockModal?.mode === 'add' ? 'emerald' : 'sky'}
        badge={
          stockModal ? (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md whitespace-nowrap ${
                (stockModal.product.quantity <= 0
                  ? GROUP_META.out_of_stock
                  : stockModal.product.quantity <= Number(low)
                  ? GROUP_META.low_stock
                  : stockModal.product.quantity >= Number(high)
                  ? GROUP_META.high_stock
                  : GROUP_META.normal
                ).pillClass
              }`}
            >
              {t(
                `stock.${
                  (stockModal.product.quantity <= 0
                    ? GROUP_META.out_of_stock
                    : stockModal.product.quantity <= Number(low)
                    ? GROUP_META.low_stock
                    : stockModal.product.quantity >= Number(high)
                    ? GROUP_META.high_stock
                    : GROUP_META.normal
                  ).key
                }`
              )}
            </span>
          ) : undefined
        }
        onClose={() => setStockModal(null)}
        footer={
          stockModal ? (
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStockModal(null)}
                className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer active:scale-95 shadow-2xs"
              >
                {t('stock.cancel', t('common.cancel', 'Cancel'))}
              </button>
              <button
                type="button"
                onClick={saveStock}
                style={{
                  backgroundColor: 'var(--btn-primary-hex, var(--primary-hex, #ec4899))',
                }}
                className="h-10 px-5 rounded-xl hover:brightness-90 text-white text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Check className="size-4 stroke-[2.5]" />
                <span>{t('stock.save', t('common.save', 'Save Changes'))}</span>
              </button>
            </div>
          ) : undefined
        }
      >
        {stockModal && (
          <div className="p-6 space-y-4">
            {/* Current Stock Banner with Product Image */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                <div className="size-11 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                  <img
                    src={getProductImage(stockModal.product)}
                    alt={stockModal.product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/images/default-product.svg';
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate">
                    {stockModal.product.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-400">
                      {t('stock.currentStockLabel', 'Current stock')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      • ID: #{stockModal.product.id}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                  {stockModal.product.quantity}
                </span>
              </div>
            </div>

            {/* Stepper Input Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {stockModal.mode === 'add'
                    ? t('stock.qtyToAdd', 'Quantity to add')
                    : t('stock.newQty', 'New quantity')}
                </label>
              </div>

              {/* Stepper with Minus / Input / Plus */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setStockModal({
                      ...stockModal,
                      qty: Math.max(0, (Number(stockModal.qty) || 0) - 1),
                    })
                  }
                  className="size-11 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 shadow-2xs cursor-pointer transition-all shrink-0"
                >
                  <Minus className="size-4.5 stroke-[2.5]" />
                </button>

                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    value={stockModal.qty}
                    onChange={(e) => setStockModal({ ...stockModal, qty: e.target.value })}
                    className="w-full h-11 text-center text-2xl font-bold font-mono text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setStockModal({
                      ...stockModal,
                      qty: (Number(stockModal.qty) || 0) + 1,
                    })
                  }
                  className="size-11 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 shadow-2xs cursor-pointer transition-all shrink-0"
                >
                  <Plus className="size-4.5 stroke-[2.5]" />
                </button>
              </div>

              {/* Quick Presets / Shortcut Chips */}
              <div className="flex items-center gap-1.5 pt-2.5 flex-wrap">
                <span className="text-[11px] text-slate-400 font-semibold mr-1">
                  {stockModal.mode === 'add' ? '+ Quick:' : 'Preset:'}
                </span>
                {(stockModal.mode === 'add' ? [5, 10, 20, 50] : [0, 10, 25, 50, 100]).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      if (stockModal.mode === 'add') {
                        setStockModal({
                          ...stockModal,
                          qty: (Number(stockModal.qty) || 0) + num,
                        });
                      } else {
                        setStockModal({
                          ...stockModal,
                          qty: num,
                        });
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
                  >
                    {stockModal.mode === 'add' ? `+${num}` : num}
                  </button>
                ))}
              </div>
            </div>

            {/* Resulting Stock preview banner */}
            {stockModal.mode === 'add' && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 text-xs">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                  <CheckCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('stock.resultingStock', 'Resulting stock:')}</span>
                </div>
                <span className="font-bold font-mono text-sm text-emerald-800 dark:text-emerald-300">
                  {stockModal.product.quantity} + {Number(stockModal.qty) || 0} ={' '}
                  <strong className="text-base underline underline-offset-2">
                    {(stockModal.product.quantity || 0) + (Number(stockModal.qty) || 0)}
                  </strong>
                </span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
