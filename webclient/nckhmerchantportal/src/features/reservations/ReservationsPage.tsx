import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Search,
  ChevronDown,
  Clock,
  Users,
  Utensils,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useRestaurantStore } from '../../stores/restaurantStore';
import { Reservation, ReservationStatus } from '../../types/restaurant';
import { ReservationModal } from './ReservationModal';
import { ReservationDetailsModal } from './ReservationDetailsModal';
import { ReservationRowActions } from './ReservationActions';
import { RestroDatePickerPopover } from '../floor-plan/RestroDatePickerPopover';
import { DeleteConfirmDialog } from '../../components/common/DeleteConfirmDialog';
import { useLanguage } from '../../i18n';
import toast from '../../utils/toast';
import { DataTableViewOptions, Pagination, Breadcrumbs } from '../../components/common';

export const ReservationsPage: React.FC = () => {
  const {
    reservations,
    deleteReservation,
    updateReservation,
    updateTableStatus,
    tables,
    selectedDate,
    setSelectedDate,
    fetchReservations,
    fetchTables,
    isLoadingReservations,
  } = useRestaurantStore();
  const { t } = useLanguage();

  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'selected'>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingRes, setEditingRes] = useState<Reservation | null>(null);
  const [viewingRes, setViewingRes] = useState<Reservation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchReservations();
    fetchTables();
  }, [fetchReservations, fetchTables]);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.allSettled([fetchReservations(), fetchTables()]);
    setIsRefreshing(false);
  };

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    dateTime: true,
    partySize: true,
    table: true,
    duration: true,
    status: true,
  });

  const toggleColumn = (id: string) => {
    setVisibleColumns((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const statusLabels: Record<string, string> = {
    upcoming: t('restaurant.statusUpcoming', 'Upcoming'),
    seated: t('restaurant.statusSeated', 'Seated'),
    completed: t('restaurant.statusCompleted', 'Completed'),
    cancelled: t('restaurant.statusCancelled', 'Cancelled'),
  };

  const statusBadge = {
    seated: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    upcoming: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
    completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
  };

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        r.guestName.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        r.tableId.toLowerCase().includes(q) ||
        (r.notes && r.notes.toLowerCase().includes(q));

      const matchDate = dateFilter === 'all' || r.date === selectedDate;
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;

      return matchSearch && matchDate && matchStatus;
    });
  }, [reservations, search, dateFilter, selectedDate, statusFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    await deleteReservation(deleteTarget.id);
    setIsDeleting(false);
    setDeleteTarget(null);
    toast.success(t('restaurant.resDeleted', 'Reservation deleted'));
  };

  const handleQuickSeat = async (res: Reservation) => {
    await updateReservation(res.id, { status: 'seated' });
    if (res.tableId) {
      const matchNum = res.tableId.match(/\d+/);
      if (matchNum) {
        const num = parseInt(matchNum[0], 10);
        const table = tables.find((t) => t.number === num);
        if (table) {
          await updateTableStatus(table.id, 'occupied');
        }
      }
    }
    toast.success(t('restaurant.guestsSeated', { name: res.guestName, number: res.tableId }));
  };

  const handleQuickComplete = async (res: Reservation) => {
    await updateReservation(res.id, { status: 'completed' });
    if (res.tableId) {
      const matchNum = res.tableId.match(/\d+/);
      if (matchNum) {
        const num = parseInt(matchNum[0], 10);
        const table = tables.find((t) => t.number === num);
        if (table) {
          await updateTableStatus(table.id, 'available');
        }
      }
    }
    toast.success(t('restaurant.reservationUpdated', 'Reservation updated'));
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <Breadcrumbs />
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t('restaurant.reservations', 'Reservations')}
          </h1>
          <span className="size-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center">
            {reservations.length}
          </span>
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh reservations"
            disabled={isRefreshing || isLoadingReservations}
            className="size-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`size-4 ${isRefreshing || isLoadingReservations ? 'animate-spin text-pink-500' : ''}`} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          style={{
            backgroundColor: 'var(--btn-primary-hex, var(--primary-hex, #ec4899))',
          }}
          className="h-10 sm:h-10.5 px-4.5 rounded-xl hover:brightness-90 text-white text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow active:scale-[0.98]"
        >
          <Plus className="size-4 stroke-[2.5]" />
          <span>{t('restaurant.newReservation', 'New Reservation')}</span>
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Total Bookings */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-panel">
          <div className="flex items-center justify-between mb-2">
            <div className="size-8.5 rounded-lg bg-orange-100 dark:bg-orange-950/50 text-orange-600 flex items-center justify-center">
              <Calendar className="size-4" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/30 text-orange-600">
              {t('restaurant.allBookings', 'ALL BOOKINGS')}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">
            {reservations.length}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {t('restaurant.totalBookings', 'Total Bookings')}
          </p>
        </div>

        {/* Card 2: Seated & Upcoming */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-panel">
          <div className="flex items-center justify-between mb-2">
            <div className="size-8.5 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Utensils className="size-4" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
              {t('common.active', 'ACTIVE')}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">
            {reservations.filter((r) => r.status === 'seated' || r.status === 'upcoming').length}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {t('restaurant.seatedUpcoming', 'Seated & Upcoming')}
          </p>
        </div>

        {/* Card 3: Total Guests */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-panel">
          <div className="flex items-center justify-between mb-2">
            <div className="size-8.5 rounded-lg bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Users className="size-4" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60">
              {t('restaurant.guests', 'GUESTS')}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">
            {reservations.reduce((sum, r) => sum + (r.partySize || 0), 0)}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {t('restaurant.totalGuests', 'Total Guests')}
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-panel font-sans">
        {/* Date Filter Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDateFilter('all');
              setCurrentPage(1);
            }}
            className={`h-10 sm:h-10.5 px-3.5 sm:px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${
              dateFilter === 'all'
                ? 'border-[#ea580c] bg-[#ea580c] text-white shadow-xs'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {t('restaurant.allDates', 'All Dates')}
          </button>

          <RestroDatePickerPopover
            selectedDate={selectedDate}
            isActive={dateFilter === 'selected'}
            className={`h-10 sm:h-10.5 px-3.5 sm:px-4 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
              dateFilter === 'selected'
                ? 'border-[#ea580c] bg-[#ea580c] text-white shadow-xs'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
            onChange={(newDate) => {
              setSelectedDate(newDate);
              setDateFilter('selected');
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64 md:w-72">
          <Search className="size-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={t('restaurant.searchGuest', 'Search guest name...')}
            className="h-10 sm:h-10.5 w-full pl-10 pr-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
          />
        </div>

        {/* Status Filter Dropdown */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 sm:h-10.5 pl-3.5 pr-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 appearance-none cursor-pointer focus:outline-none focus:border-orange-500 transition-all"
          >
            <option value="all">{t('restaurant.allStatuses', 'All statuses')}</option>
            <option value="seated">{t('restaurant.statusSeated', 'Seated')}</option>
            <option value="upcoming">{t('restaurant.statusUpcoming', 'Upcoming')}</option>
            <option value="completed">{t('restaurant.statusCompleted', 'Completed')}</option>
            <option value="cancelled">{t('restaurant.statusCancelled', 'Cancelled')}</option>
          </select>
          <ChevronDown className="size-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Reset Button */}
        <button
          type="button"
          onClick={() => {
            setSearch('');
            setStatusFilter('all');
            setDateFilter('all');
            setCurrentPage(1);
          }}
          className="h-10 sm:h-10.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-95 shadow-2xs"
        >
          {t('buttons.reset', t('common.reset', 'Reset'))}
        </button>

        {/* Column Visibility Options */}
        <div className="ml-auto">
          <DataTableViewOptions
            columns={[
              { id: 'dateTime', label: t('restaurant.dateTime', 'Date & Time'), visible: visibleColumns.dateTime },
              { id: 'partySize', label: t('restaurant.partySize', 'Party Size'), visible: visibleColumns.partySize },
              { id: 'table', label: t('restaurant.table', 'Table'), visible: visibleColumns.table },
              { id: 'duration', label: t('restaurant.duration', 'Duration'), visible: visibleColumns.duration },
              { id: 'status', label: t('restaurant.status', 'Status'), visible: visibleColumns.status },
            ]}
            onToggleColumn={toggleColumn}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-panel overflow-hidden font-sans">
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase text-[11px] bg-slate-50/50 dark:bg-slate-800/50">
                <th className="py-3.5 px-4">{t('restaurant.guest', 'Guest')}</th>
                {visibleColumns.dateTime && <th className="py-3.5 px-4">{t('restaurant.dateTime', 'Date & Time')}</th>}
                {visibleColumns.partySize && <th className="py-3.5 px-4">{t('restaurant.partySize', 'Party Size')}</th>}
                {visibleColumns.table && <th className="py-3.5 px-4">{t('restaurant.table', 'Table')}</th>}
                {visibleColumns.duration && <th className="py-3.5 px-4">{t('restaurant.duration', 'Duration')}</th>}
                {visibleColumns.status && <th className="py-3.5 px-4">{t('restaurant.status', 'Status')}</th>}
                <th className="py-3.5 px-4 text-right">{t('restaurant.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {paginated.map((res) => {
                const tableText = res.tableId
                  ? res.tableId.replace(/Table\s*/i, `${t('restaurant.tableLabel', 'Table')} `)
                  : t('restaurant.noTableAssigned', 'No table assigned');

                return (
                  <tr
                    key={res.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* Guest */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {res.guestName}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {res.phone}
                      </p>
                    </td>

                    {/* Date & Time */}
                    {visibleColumns.dateTime && (
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-slate-800 dark:text-slate-200">
                          {res.date}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {res.time}
                        </p>
                      </td>
                    )}

                    {/* Party Size */}
                    {visibleColumns.partySize && (
                      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {res.partySize} {t('restaurant.guestsUnit', 'guests')}
                      </td>
                    )}

                    {/* Table */}
                    {visibleColumns.table && (
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        {tableText}
                      </td>
                    )}

                    {/* Duration */}
                    {visibleColumns.duration && (
                      <td className="py-3.5 px-4 text-slate-500">
                        {res.durationMinutes} {t('restaurant.minutesUnit', 'min')}
                      </td>
                    )}

                    {/* Status */}
                    {visibleColumns.status && (
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                            statusBadge[res.status] || ''
                          }`}
                        >
                          {statusLabels[res.status] || res.status}
                        </span>
                      </td>
                    )}

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <ReservationRowActions
                        reservation={res}
                        isOpen={openDropdownId === res.id}
                        onToggle={() => setOpenDropdownId(openDropdownId === res.id ? null : res.id)}
                        onView={(r) => setViewingRes(r)}
                        onEdit={(r) => setEditingRes(r)}
                        onDelete={(r) => setDeleteTarget({ id: r.id, name: r.guestName })}
                        onSeat={handleQuickSeat}
                        onComplete={handleQuickComplete}
                      />
                    </td>
                  </tr>
                );
              })}

              {paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={2 + Object.values(visibleColumns).filter(Boolean).length}
                    className="py-12 text-center text-slate-400 text-sm"
                  >
                    {t('restaurant.noReservationsFound', 'No reservations match your filter')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Standardized Pagination Footer */}
        {filtered.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            itemLabel={t('restaurant.reservations', 'reservations')}
          />
        )}
      </div>

      {/* Unified Reservation Form Modal (Insert & Update) */}
      <ReservationModal
        isOpen={isNewModalOpen || Boolean(editingRes)}
        reservation={editingRes}
        onClose={() => {
          setIsNewModalOpen(false);
          setEditingRes(null);
        }}
      />

      {/* View Reservation Detail Modal */}
      <ReservationDetailsModal
        reservation={viewingRes}
        isOpen={Boolean(viewingRes)}
        onClose={() => setViewingRes(null)}
        onEdit={(res) => setEditingRes(res)}
        onDelete={(id, name) => setDeleteTarget({ id, name })}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        itemName={deleteTarget?.name}
        title={t('restaurant.confirmDeleteResTitle', 'Delete Reservation')}
        isDeleting={isDeleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default ReservationsPage;
