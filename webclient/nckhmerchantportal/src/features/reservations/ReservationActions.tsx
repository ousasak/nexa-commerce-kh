import React from 'react';
import {
  MoreHorizontal,
  Edit2,
  Trash2,
  Eye,
  Utensils,
  CheckCircle2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { Reservation } from '../../types/restaurant';
import { useLanguage } from '../../i18n';

export interface ReservationRowActionsProps {
  reservation: Reservation;
  isOpen: boolean;
  onToggle: () => void;
  onView: (reservation: Reservation) => void;
  onEdit: (reservation: Reservation) => void;
  onDelete: (reservation: Reservation) => void;
  onSeat?: (reservation: Reservation) => void;
  onComplete?: (reservation: Reservation) => void;
}

export const ReservationRowActions: React.FC<ReservationRowActionsProps> = ({
  reservation,
  isOpen,
  onToggle,
  onView,
  onEdit,
  onDelete,
  onSeat,
  onComplete,
}) => {
  const { t } = useLanguage();

  return (
    <div className="relative inline-flex items-center justify-end action-dropdown-container">
      <button
        type="button"
        onClick={onToggle}
        title={t('common.more', 'More Options')}
        className={`size-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer active:scale-95 ${
          isOpen
            ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 shadow-xs'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs'
        }`}
      >
        <MoreHorizontal className="size-4.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10.5 z-30 w-48 py-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-100 font-sans text-left">
          {/* View Details */}
          <button
            type="button"
            onClick={() => {
              onToggle();
              onView(reservation);
            }}
            className="w-full px-3.5 py-2 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
          >
            <Eye className="size-4 text-slate-400" />
            <span>{t('restaurant.viewDetails', t('common.view', 'View Details'))}</span>
          </button>

          {/* Quick Seat Guests (if status is upcoming) */}
          {reservation.status === 'upcoming' && onSeat && (
            <button
              type="button"
              onClick={() => {
                onToggle();
                onSeat(reservation);
              }}
              className="w-full px-3.5 py-2 text-sm text-left text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
            >
              <Utensils className="size-4 text-emerald-500" />
              <span>{t('restaurant.markSeated', 'Seat Guests')}</span>
            </button>
          )}

          {/* Quick Mark Completed (if status is seated) */}
          {reservation.status === 'seated' && onComplete && (
            <button
              type="button"
              onClick={() => {
                onToggle();
                onComplete(reservation);
              }}
              className="w-full px-3.5 py-2 text-sm text-left text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
            >
              <CheckCircle2 className="size-4 text-blue-500" />
              <span>{t('restaurant.markCompleted', 'Complete')}</span>
            </button>
          )}

          {/* Edit */}
          <button
            type="button"
            onClick={() => {
              onToggle();
              onEdit(reservation);
            }}
            className="w-full px-3.5 py-2 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
          >
            <Edit2 className="size-4 text-slate-400" />
            <span>{t('restaurant.editReservation', t('common.edit', 'Edit'))}</span>
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-700/60" />

          {/* Delete */}
          <button
            type="button"
            onClick={() => {
              onToggle();
              onDelete(reservation);
            }}
            className="w-full px-3.5 py-2 text-sm text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
          >
            <Trash2 className="size-4" />
            <span>{t('restaurant.delete', t('common.delete', 'Delete'))}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export interface ReservationHeaderActionsProps {
  onAdd: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const ReservationHeaderActions: React.FC<ReservationHeaderActionsProps> = ({
  onAdd,
  onRefresh,
  isRefreshing,
}) => {
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-2.5">
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="size-10 sm:size-10.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin text-pink-500' : ''}`} />
        </button>
      )}

      <button
        type="button"
        onClick={onAdd}
        style={{
          backgroundColor: 'var(--btn-primary-hex, var(--primary-hex, #ec4899))',
        }}
        className="h-10 sm:h-10.5 px-4.5 rounded-xl hover:brightness-90 text-white text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow active:scale-[0.98]"
      >
        <Plus className="size-4 stroke-[2.5]" />
        <span>{t('restaurant.newReservation', 'New Reservation')}</span>
      </button>
    </div>
  );
};

export default ReservationRowActions;

