import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Clock,
  Utensils,
  ShoppingBag,
  Bike,
  CheckCircle2,
  ChefHat,
  Flame,
  Check,
  GripVertical,
  Undo2,
  RotateCcw,
  Search,
  CheckSquare,
  Square,
  Circle,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useRestaurantStore } from '../../stores/restaurantStore';
import { KitchenOrder, KitchenOrderStatus, OrderType } from '../../types/restaurant';
import { useLanguage } from '../../i18n';
import toast from '../../utils/toast';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';

export const KitchenDisplayPage: React.FC = () => {
  const { orders, updateOrderStatus, fetchOrders, isLoadingOrders } = useRestaurantStore();
  const { t } = useLanguage();

  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<KitchenOrderStatus | null>(null);

  // Localized column status label helper
  const getColumnLabel = (status: KitchenOrderStatus): string => {
    switch (status) {
      case 'new':
        return t('restaurant.statusNew', 'New');
      case 'preparing':
        return t('restaurant.statusPreparing', 'Preparing');
      case 'ready':
        return t('restaurant.statusReady', 'Ready');
      case 'served':
        return t('restaurant.statusServed', 'Served');
      default:
        return status;
    }
  };

  // 1. Sound Alert State (Web Audio API Synthesizer)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('restro_kds_sound_v1') !== 'false';
    } catch {
      return true;
    }
  });

  // Keep sound state in sync with Shop Settings changes across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'restro_kds_sound_v1') {
        setSoundEnabled(e.newValue !== 'false');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const playOrderChime = () => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      // Harmonious 3-tone chime (E5 -> A5 -> C6)
      playTone(659.25, 0, 0.16);
      playTone(880.0, 0.12, 0.22);
      playTone(1046.5, 0.22, 0.38);
    } catch {
      // Graceful fallback if browser audio policy blocks autoplay
    }
  };

  // Detect incoming new orders and sound the chime
  const prevOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (orders.length > 0) {
      if (isInitialLoadRef.current) {
        prevOrderIdsRef.current = new Set(orders.map((o) => o.id));
        isInitialLoadRef.current = false;
        return;
      }

      const currentIds = new Set(orders.map((o) => o.id));
      const newArrivals = orders.filter(
        (o) => !prevOrderIdsRef.current.has(o.id) && o.status === 'new'
      );

      if (newArrivals.length > 0) {
        if (soundEnabled) {
          playOrderChime();
        }
        toast.info(
          t('restaurant.newOrderAlert', {
            id: newArrivals.map((o) => o.id).join(', '),
            defaultValue: `New order ${newArrivals.map((o) => o.id).join(', ')} received!`,
          })
        );
      }

      prevOrderIdsRef.current = currentIds;
    }
  }, [orders, soundEnabled, t]);

  // 2. Fullscreen Mode
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 3. Item-Level Tap Strike-Through
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('restro_kds_completed_items_v1');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const toggleItemComplete = (orderId: string, itemIdx: number) => {
    const key = `${orderId}-${itemIdx}`;
    setCompletedItems((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('restro_kds_completed_items_v1', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // 4. Recall / Undo State
  const [lastTransition, setLastTransition] = useState<{
    orderId: string;
    prevStatus: KitchenOrderStatus;
    nextStatus: KitchenOrderStatus;
  } | null>(null);

  const handleStatusChange = async (
    orderId: string,
    targetStatus: KitchenOrderStatus,
    successMessage?: string
  ) => {
    const normalizeId = (id: string | number) => String(id).replace(/[^0-9]/g, '');
    const targetId = normalizeId(orderId);
    const order = orders.find((o) => normalizeId(o.id) === targetId);

    if (!order || order.status === targetStatus) return;

    setLastTransition({
      orderId: order.id,
      prevStatus: order.status,
      nextStatus: targetStatus,
    });

    await updateOrderStatus(order.id, targetStatus);
    if (successMessage) {
      toast.success(successMessage);
    }
  };

  const handleStartPreparing = (orderId: string) =>
    handleStatusChange(
      orderId,
      'preparing',
      t('restaurant.orderStarted', {
        id: orderId,
        defaultValue: `Order ${orderId} is now preparing`,
      })
    );

  const handleMarkReady = (orderId: string) =>
    handleStatusChange(
      orderId,
      'ready',
      t('restaurant.orderReady', {
        id: orderId,
        defaultValue: `Order ${orderId} is ready for pickup/serving!`,
      })
    );

  const handleMarkServed = (orderId: string) =>
    handleStatusChange(
      orderId,
      'served',
      t('restaurant.orderServed', {
        id: orderId,
        defaultValue: `Order ${orderId} served successfully!`,
      })
    );

  const handleRecallLast = async () => {
    if (!lastTransition) return;
    const { orderId, prevStatus } = lastTransition;
    await updateOrderStatus(orderId, prevStatus);
    toast.success(
      t('restaurant.orderRecalled', {
        id: orderId,
        status: getColumnLabel(prevStatus),
        defaultValue: `Order ${orderId} recalled back to ${getColumnLabel(prevStatus)}`,
      })
    );
    setLastTransition(null);
  };

  const handleRecallServed = async (orderId: string) => {
    await updateOrderStatus(orderId, 'ready');
    toast.success(
      t('restaurant.orderRecalled', {
        id: orderId,
        status: getColumnLabel('ready'),
        defaultValue: `Order ${orderId} recalled back to ready`,
      })
    );
  };

  // 5. Order Type & Search Filtering
  const [typeFilter, setTypeFilter] = useState<'all' | OrderType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const typeCounts = useMemo(() => {
    const counts = { all: orders.length, 'dine-in': 0, takeaway: 0, delivery: 0 };
    orders.forEach((o) => {
      if (counts[o.type] !== undefined) {
        counts[o.type]++;
      }
    });
    return counts;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (typeFilter !== 'all' && order.type !== typeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = order.id.toLowerCase().includes(q);
        const matchTable = order.tableNumber?.toLowerCase().includes(q);
        const matchCustomer = order.customerName?.toLowerCase().includes(q);
        const matchItem = order.items.some((item) => item.name.toLowerCase().includes(q));
        if (!matchId && !matchTable && !matchCustomer && !matchItem) {
          return false;
        }
      }
      return true;
    });
  }, [orders, typeFilter, searchQuery]);

  // Fetch kitchen orders on mount and poll every 20 seconds
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => {
      fetchOrders();
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Real-time ticking clock
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setCurrentTime(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const columns: {
    status: KitchenOrderStatus;
    badgeColor: string;
    headerBg: string;
    accentDot: string;
  }[] = [
    {
      status: 'new',
      badgeColor: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
      headerBg: 'bg-sky-50/60 dark:bg-sky-950/20 border-sky-200/80 dark:border-sky-900/40',
      accentDot: 'bg-sky-500',
    },
    {
      status: 'preparing',
      badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      headerBg: 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40',
      accentDot: 'bg-amber-500',
    },
    {
      status: 'ready',
      badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      headerBg: 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40',
      accentDot: 'bg-emerald-500',
    },
    {
      status: 'served',
      badgeColor: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
      headerBg: 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800',
      accentDot: 'bg-slate-400',
    },
  ];

  const ordersByStatus = useMemo(() => {
    const map: Record<KitchenOrderStatus, KitchenOrder[]> = {
      new: [],
      preparing: [],
      ready: [],
      served: [],
      cancelled: [],
    };
    filteredOrders.forEach((o) => {
      if (map[o.status]) {
        map[o.status].push(o);
      }
    });
    return map;
  }, [filteredOrders]);

  // 6. Urgency classification helper
  const getUrgency = (
    elapsedMinutes: number,
    status: KitchenOrderStatus
  ): 'critical' | 'warning' | 'normal' | 'served' => {
    if (status === 'served') return 'served';
    if (elapsedMinutes >= 20) return 'critical';
    if (elapsedMinutes >= 10) return 'warning';
    return 'normal';
  };

  const handleDrop = async (orderId: string, targetStatus: KitchenOrderStatus) => {
    await handleStatusChange(
      orderId,
      targetStatus,
      t('restaurant.orderStatusUpdated', {
        id: orderId,
        status: getColumnLabel(targetStatus),
        defaultValue: `Order ${orderId} moved to ${getColumnLabel(targetStatus)}`,
      })
    );
  };

  return (
    <div
      className={`space-y-4 animate-in fade-in duration-200 ${
        isFullscreen ? 'p-4 bg-slate-50 dark:bg-slate-950 min-h-screen' : ''
      }`}
    >
      {!isFullscreen && <Breadcrumbs />}

      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{t('restaurant.kitchenDisplay', 'Kitchen Display')}</span>
          </h1>
          <p className="text-xs text-slate-500">
            {t('restaurant.liveOrderQueue', 'Live order queue')}
          </p>
        </div>

        {/* Action Controls Toolbar - Clean Header with Live Clock */}
        <div className="flex items-center gap-2">
          {/* Recall / Undo Button */}
          {lastTransition && (
            <button
              type="button"
              onClick={handleRecallLast}
              className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs animate-pulse cursor-pointer"
              title={`${t('restaurant.recallLastOrder', 'Recall Last Order')}: ${lastTransition.orderId}`}
            >
              <Undo2 className="size-3.5" />
              <span>
                {t('restaurant.recallOrder', 'Recall')} {lastTransition.orderId}
              </span>
            </button>
          )}

          {/* Live Clock */}
          <div className="px-3.5 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex items-center gap-2 select-none">
            <Clock className="size-3.5 text-slate-400 dark:text-slate-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t('restaurant.currentTime', 'Current time')}{' '}
              <strong className="text-slate-800 dark:text-slate-100 font-semibold">
                {currentTime}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Quick Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
        {/* Order Type Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>{t('restaurant.filterAll', 'All Orders')}</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10.5px] font-bold ${
                typeFilter === 'all'
                  ? 'bg-white/20 dark:bg-slate-900/20 text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {typeCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('dine-in')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              typeFilter === 'dine-in'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Utensils className="size-3.5" />
            <span>{t('restaurant.filterDineIn', 'Dine-in')}</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10.5px] font-bold ${
                typeFilter === 'dine-in' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {typeCounts['dine-in']}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('takeaway')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              typeFilter === 'takeaway'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="size-3.5" />
            <span>{t('restaurant.filterTakeaway', 'Takeaway')}</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10.5px] font-bold ${
                typeFilter === 'takeaway' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {typeCounts.takeaway}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('delivery')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              typeFilter === 'delivery'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bike className="size-3.5" />
            <span>{t('restaurant.filterDelivery', 'Delivery')}</span>
            <span
              className={`px-1.5 py-0.2 rounded-md text-[10.5px] font-bold ${
                typeFilter === 'delivery' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {typeCounts.delivery}
            </span>
          </button>
        </div>

        {/* Quick Search Input */}
        <div className="relative min-w-[220px] max-w-xs flex-1">
          <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('restaurant.searchKdsPlaceholder', 'Search table, order #, guest...')}
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-pink-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* 4 Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {columns.map((col) => {
          const list = ordersByStatus[col.status] || [];
          const colTitle = getColumnLabel(col.status);

          return (
            <div
              key={col.status}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverCol !== col.status) setDragOverCol(col.status);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverCol(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const orderId = e.dataTransfer.getData('text/plain') || draggedOrderId;
                if (orderId) {
                  handleDrop(orderId, col.status);
                }
                setDragOverCol(null);
                setDraggedOrderId(null);
              }}
              className={`rounded-2xl border p-3 flex flex-col gap-3 min-h-[500px] transition-all duration-200 ${
                col.headerBg
              } ${
                dragOverCol === col.status
                  ? 'ring-2 ring-orange-500/80 bg-orange-50/70 dark:bg-orange-950/40 border-orange-400 scale-[1.01]'
                  : ''
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center gap-2 px-1">
                <span className={`size-2 rounded-full ${col.accentDot}`} />
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {colTitle}
                </span>
                <span
                  className={`size-5 rounded-full text-[11px] font-bold flex items-center justify-center border ${col.badgeColor}`}
                >
                  {list.length}
                </span>
              </div>

              {/* Drop Indicator Placeholder */}
              {dragOverCol === col.status && draggedOrderId && (
                <div className="border-2 border-dashed border-orange-400/80 rounded-2xl p-4 text-center text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-100/50 dark:bg-orange-950/40 animate-pulse flex items-center justify-center gap-2">
                  <span>{t('restaurant.dropHere', 'Drop order here')}</span>
                </div>
              )}

              {/* Cards List */}
              <div className="space-y-3">
                {list.map((order) => {
                  const isServed = order.status === 'served';
                  const isBeingDragged = draggedOrderId === order.id;
                  const urgency = getUrgency(order.elapsedMinutes, order.status);

                  // Calculate checked items count
                  const checkedCount = order.items.filter(
                    (_, idx) => completedItems[`${order.id}-${idx}`]
                  ).length;
                  const allItemsChecked =
                    order.items.length > 0 && checkedCount === order.items.length;

                  // Urgency Border Accent (with !border-l-4 and dark:!border-l-* to ensure high visibility in both light & dark mode)
                  const borderAccentClass =
                    urgency === 'critical'
                      ? '!border-l-4 !border-l-rose-500 dark:!border-l-rose-500 ring-1 ring-rose-500/25 dark:ring-rose-500/35 shadow-rose-500/5'
                      : urgency === 'warning'
                      ? '!border-l-4 !border-l-amber-500 dark:!border-l-amber-400 ring-1 ring-amber-500/15 dark:ring-amber-500/25'
                      : urgency === 'normal'
                      ? '!border-l-4 !border-l-emerald-500 dark:!border-l-emerald-400 ring-1 ring-emerald-500/15 dark:ring-emerald-400/25'
                      : '!border-l-4 !border-l-slate-300 dark:!border-l-slate-600 opacity-80';

                  // Timer Badge styling
                  const timerBadgeClass =
                    urgency === 'critical'
                      ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold'
                      : urgency === 'warning'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-semibold'
                      : urgency === 'normal'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                      : 'bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700';

                  return (
                    <div
                      key={order.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', order.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggedOrderId(order.id);
                      }}
                      onDragEnd={() => {
                        setDraggedOrderId(null);
                        setDragOverCol(null);
                      }}
                      className={`bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3 cursor-grab active:cursor-grabbing ${borderAccentClass} ${
                        isBeingDragged ? 'opacity-30 scale-95 border-dashed border-orange-400' : ''
                      }`}
                    >
                      {/* Card Header: Order ID + Target & Urgency Elapsed */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm font-mono text-slate-900 dark:text-white">
                              {order.id}
                            </span>

                            {order.type === 'dine-in' && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                                <Utensils className="size-3" />
                                <span>{order.tableNumber || t('restaurant.tableLabel', 'Table')}</span>
                              </span>
                            )}

                            {order.type === 'takeaway' && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 truncate max-w-[130px]">
                                <ShoppingBag className="size-3 shrink-0" />
                                <span className="truncate">{order.customerName || t('restaurant.takeaway', 'Takeaway')}</span>
                              </span>
                            )}

                            {order.type === 'delivery' && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 truncate max-w-[130px]">
                                <Bike className="size-3 shrink-0" />
                                <span className="truncate">{order.customerName || t('restaurant.delivery', 'Delivery')}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-[11px] text-slate-400">
                              {order.items.reduce((sum, i) => sum + i.quantity, 0)}{' '}
                              {t('restaurant.items', 'items')}
                            </p>
                            {/* Tap Progress Sub-indicator */}
                            {!isServed && checkedCount > 0 && (
                              <span className="text-[10.5px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded-md">
                                {t('restaurant.itemsCompleted', {
                                  completed: checkedCount,
                                  total: order.items.length,
                                  defaultValue: `${checkedCount}/${order.items.length} ready`,
                                })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Urgency Badge & Drag Handle */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {urgency === 'critical' && (
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold uppercase tracking-wide bg-rose-600 text-white animate-pulse">
                              {t('restaurant.urgentOverdue', 'LATE')}
                            </span>
                          )}

                          <div
                            className={`px-2 py-0.5 rounded-lg text-xs font-medium flex items-center gap-1 ${timerBadgeClass}`}
                            title={`${t('restaurant.elapsedTime', 'Elapsed time')}: ${order.elapsedMinutes} ${t('restaurant.minutesUnit', 'min')}`}
                          >
                            <Clock
                              className={`size-3 ${
                                urgency === 'critical' ? 'text-rose-600 animate-pulse' : ''
                              }`}
                            />
                            <span>{order.elapsedMinutes}{t('restaurant.minuteShort', 'm')}</span>
                          </div>

                          <GripVertical className="size-3.5 text-slate-300 dark:text-slate-600 cursor-grab" />
                        </div>
                      </div>

                      {/* Itemized Foods list with Tap-to-Strike Feature */}
                      <div className="space-y-1.5">
                        {order.items.map((item, idx) => {
                          const itemKey = `${order.id}-${idx}`;
                          const isItemChecked = isServed || !!completedItems[itemKey];

                          return (
                            <div
                              key={idx}
                              onClick={() => !isServed && toggleItemComplete(order.id, idx)}
                              className={`text-xs p-1.5 -mx-1.5 rounded-lg select-none ${
                                isServed ? 'cursor-default' : 'cursor-pointer'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {!isServed && (
                                  <div className="mt-0.5 shrink-0">
                                    {isItemChecked ? (
                                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                                    ) : (
                                      <Circle className="size-3.5 text-slate-300 dark:text-slate-600" />
                                    )}
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <p
                                    className={`font-semibold transition-all ${
                                      isItemChecked
                                        ? 'line-through text-slate-400 dark:text-slate-500'
                                        : 'text-slate-800 dark:text-slate-200'
                                    }`}
                                  >
                                    <span
                                      className={`mr-1.5 font-bold ${
                                        isItemChecked
                                          ? 'text-slate-400 dark:text-slate-500'
                                          : 'text-orange-600 dark:text-orange-400'
                                      }`}
                                    >
                                      {item.quantity}×
                                    </span>
                                    {item.name}
                                  </p>

                                  {/* Subtext options/add-ons */}
                                  {item.options && item.options.length > 0 && (
                                    <p
                                      className={`text-[10.5px] mt-0.5 leading-snug ${
                                        isItemChecked
                                          ? 'line-through text-slate-400 dark:text-slate-600'
                                          : 'text-slate-500 dark:text-slate-400 pl-1'
                                      }`}
                                    >
                                      {item.options.join(' · ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Card Action Button */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                        {col.status === 'new' && (
                          <button
                            type="button"
                            onClick={() => handleStartPreparing(order.id)}
                            className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Flame className="size-3.5 text-orange-500" />
                            <span>{t('restaurant.startPreparing', 'Start Preparing')}</span>
                          </button>
                        )}

                        {col.status === 'preparing' && (
                          <button
                            type="button"
                            onClick={() => handleMarkReady(order.id)}
                            style={{
                              backgroundColor:
                                'var(--btn-primary-hex, var(--primary-hex, #ec4899))',
                            }}
                            className={`w-full py-2 px-3 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                              allItemsChecked ? 'ring-2 ring-emerald-400 ring-offset-1' : ''
                            }`}
                          >
                            <Check className="size-3.5 stroke-[2.5]" />
                            <span>{t('restaurant.markReady', 'Mark Ready')}</span>
                          </button>
                        )}

                        {col.status === 'ready' && (
                          <button
                            type="button"
                            onClick={() => handleMarkServed(order.id)}
                            className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          >
                            <CheckCircle2 className="size-3.5" />
                            <span>{t('restaurant.markServed', 'Mark Served')}</span>
                          </button>
                        )}

                        {col.status === 'served' && (
                          <div className="flex items-center justify-between gap-2 pt-1">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="size-3.5" />
                              <span>{t('restaurant.served', 'Served')}</span>
                            </div>

                            {/* Direct Card Recall to Ready */}
                            <button
                              type="button"
                              onClick={() => handleRecallServed(order.id)}
                              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                              title={t('restaurant.undoToReady', 'Recall to Ready')}
                            >
                              <RotateCcw className="size-3" />
                              <span>{t('restaurant.undoToReady', 'Recall')}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {list.length === 0 && (
                  <div className="py-12 text-center text-xs text-slate-400">
                    {t('restaurant.noOrdersInCol', 'No orders in this column')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KitchenDisplayPage;
