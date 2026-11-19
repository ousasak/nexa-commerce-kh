import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Settings2, ChevronDown, RefreshCw } from 'lucide-react';
import { useRestaurantStore } from '../../stores/restaurantStore';
import { RestaurantTable, TableStatus, Reservation } from '../../types/restaurant';
import { FloorPlanTableCard } from './FloorPlanTableCard';
import { TableDetailsModal } from './TableDetailsModal';
import { TableSettingsDrawer } from './TableSettingsDrawer';
import { UpcomingReservationsSection } from './UpcomingReservationsSection';
import { ReservationModal } from '../reservations/ReservationModal';
import { RestroDatePickerPopover } from './RestroDatePickerPopover';
import { useLanguage } from '../../i18n';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';

const STATUS_OPTIONS: { value: string; label: string; dot?: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'available', label: 'Available', dot: 'bg-emerald-500' },
  { value: 'reserved', label: 'Reserved', dot: 'bg-amber-500' },
  { value: 'occupied', label: 'Occupied', dot: 'bg-rose-500' },
  { value: 'cleaning', label: 'Cleaning', dot: 'bg-sky-500' },
];

export const FloorPlanPage: React.FC = () => {
  const {
    tables,
    reservations,
    selectedDate,
    setSelectedDate,
    fetchTables,
    fetchReservations,
    isLoadingTables,
  } = useRestaurantStore();
  const { t } = useLanguage();

  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeTable, setActiveTable] = useState<RestaurantTable | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [reservationDrawerOpen, setReservationDrawerOpen] = useState(false);
  const [reservationToEdit, setReservationToEdit] = useState<Reservation | null>(null);
  const [preselectedTableNum, setPreselectedTableNum] = useState<number | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initial load from backend API
  useEffect(() => {
    fetchTables();
    fetchReservations();
  }, [fetchTables, fetchReservations]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.allSettled([fetchTables(), fetchReservations()]);
    setIsRefreshing(false);
  };

  const sections: { id: string; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'Main Dining', label: 'Main Dining' },
    { id: 'Private Room', label: 'Private Room' },
    { id: 'Outdoor', label: 'Outdoor' },
  ];

  // Map and filter tables dynamically based on selectedDate and filters
  const filteredTables = useMemo(() => {
    return tables
      .map((table) => {
        // Look up reservation matching this table on selectedDate
        const matchingRes = reservations.find(
          (r) =>
            (r.tableId === table.id ||
              r.tableId === `Table ${table.number}` ||
              r.tableId?.toLowerCase() === `t-${String(table.number).padStart(2, '0')}`.toLowerCase() ||
              (r as any).tableDbId === (table as any).db_id) &&
            r.date === selectedDate &&
            (r.status === 'upcoming' || r.status === 'seated')
        );

        if (matchingRes) {
          return {
            ...table,
            status: (matchingRes.status === 'seated' ? 'occupied' : 'reserved') as TableStatus,
            reservedFor: matchingRes.guestName,
            reservationTime: `${matchingRes.time} · ${matchingRes.partySize} guests`,
          };
        }

        return table;
      })
      .filter((table) => {
        const matchSection = selectedSection === 'all' || table.section === selectedSection;
        const matchStatus = selectedStatus === 'all' || table.status === selectedStatus;
        return matchSection && matchStatus;
      });
  }, [tables, reservations, selectedSection, selectedStatus, selectedDate]);

  const handleOpenNewReservation = (tableNum?: number) => {
    setReservationToEdit(null);
    setPreselectedTableNum(tableNum);
    setReservationDrawerOpen(true);
  };

  const handleOpenEditReservation = (res: Reservation) => {
    setReservationToEdit(res);
    setReservationDrawerOpen(true);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <Breadcrumbs />
      {/* Top Header Row matching System Standard */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {t('restaurant.tables', 'Tables')}
            </h1>
            <p className="text-xs text-slate-500">
              {t('restaurant.floorPlanSubtitle', 'Floor plan & real-time table status')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            title={t('restaurant.refreshFloorPlan', 'Refresh floor plan')}
            disabled={isRefreshing || isLoadingTables}
            className="size-9 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer shadow-2xs active:scale-95"
          >
            <RefreshCw className={`size-4 ${isRefreshing || isLoadingTables ? 'animate-spin text-pink-500' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Picker Button Popover */}
          <RestroDatePickerPopover
            selectedDate={selectedDate}
            onChange={setSelectedDate}
            className="h-10 sm:h-10.5 px-3.5 sm:px-4 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-semibold flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95"
          />

          {/* New Reservation Button (Primary matching System Standard) */}
          <button
            type="button"
            onClick={() => handleOpenNewReservation()}
            style={{
              backgroundColor: 'var(--btn-primary-hex, var(--primary-hex, #ec4899))',
            }}
            className="h-10 sm:h-10.5 px-4.5 rounded-xl hover:brightness-90 text-white text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow active:scale-[0.98]"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>{t('restaurant.newReservation', 'New Reservation')}</span>
          </button>

          {/* Table Settings Button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label={t('restaurant.tableSettings', 'Table Settings')}
            title={t('restaurant.tableSettings', 'Table Settings')}
            className="size-10 sm:size-10.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
          >
            <Settings2 className="size-4.5" />
          </button>
        </div>
      </div>

      {/* Filter Row: Section tabs on left, Status dropdown on right */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        {/* Section Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {sections.map(({ id, label }) => {
            const isActive = selectedSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedSection(id)}
                style={
                  isActive
                    ? {
                        backgroundColor:
                          'var(--btn-primary-hex, var(--primary-hex, #ec4899))',
                      }
                    : undefined
                }
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'text-white shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Status Dropdown with indicator dots */}
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="h-9.5 pl-3.5 pr-8 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer shadow-2xs transition-all"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="size-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Tables Grid */}
      {filteredTables.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredTables.map((table) => (
            <FloorPlanTableCard
              key={table.id}
              table={table}
              onClick={() => setActiveTable(table)}
            />
          ))}
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <p className="text-slate-400 text-sm font-medium">
            {t('restaurant.noTablesFound', 'No tables match this section or status filter')}
          </p>
        </div>
      )}

      {/* Upcoming Reservations Section */}
      <UpcomingReservationsSection
        onEditReservation={handleOpenEditReservation}
      />

      {/* Table Status Dialog (RestroPOS StatusDialog) */}
      <TableDetailsModal
        table={activeTable}
        isOpen={Boolean(activeTable)}
        onClose={() => setActiveTable(null)}
        onEditReservation={handleOpenEditReservation}
      />

      {/* Table Settings Drawer */}
      <TableSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Unified Reservation Modal (New & Edit) */}
      <ReservationModal
        reservation={reservationToEdit}
        isOpen={reservationDrawerOpen}
        onClose={() => {
          setReservationDrawerOpen(false);
          setReservationToEdit(null);
        }}
        defaultTableNumber={preselectedTableNum}
      />
    </div>
  );
};

export default FloorPlanPage;
