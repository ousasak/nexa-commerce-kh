import React from 'react';
import {
  Calendar,
  Clock,
  Users,
  Phone,
  Utensils,
  CheckCircle2,
  Edit2,
  Trash2,
  User,
  FileText,
} from 'lucide-react';
import { Reservation, ReservationStatus } from '../../types/restaurant';
import { useRestaurantStore } from '../../stores/restaurantStore';
import { useLanguage } from '../../i18n';
import toast from '../../utils/toast';
import { Modal, ModalFooter } from '../../components/ui';

interface ReservationDetailsModalProps {
  reservation: Reservation | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (reservation: Reservation) => void;
  onDelete: (id: string, name: string) => void;
}

export const ReservationDetailsModal: React.FC<ReservationDetailsModalProps> = ({
  reservation,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) => {
  const { updateReservation, updateTableStatus, tables } = useRestaurantStore();
  const { t } = useLanguage();

  if (!isOpen || !reservation) return null;

  const statusBadge = {
    seated: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    upcoming: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  };

  const statusLabels: Record<ReservationStatus, string> = {
    upcoming: t('restaurant.statusUpcoming', 'Upcoming'),
    seated: t('restaurant.statusSeated', 'Seated'),
    completed: t('restaurant.statusCompleted', 'Completed'),
    cancelled: t('restaurant.statusCancelled', 'Cancelled'),
  };

  const handleSeatGuest = async () => {
    await updateReservation(reservation.id, { status: 'seated' });
    if (reservation.tableId) {
      const matchNum = reservation.tableId.match(/\d+/);
      if (matchNum) {
        const num = parseInt(matchNum[0], 10);
        const table = tables.find((t) => t.number === num);
        if (table) {
          await updateTableStatus(table.id, 'occupied', {
            reservedFor: reservation.guestName,
            reservationTime: reservation.time,
          });
        }
      }
    }
    toast.success(t('restaurant.guestsSeated', { name: reservation.guestName, number: reservation.tableId }));
    onClose();
  };

  const handleComplete = async () => {
    await updateReservation(reservation.id, { status: 'completed' });
    if (reservation.tableId) {
      const matchNum = reservation.tableId.match(/\d+/);
      if (matchNum) {
        const num = parseInt(matchNum[0], 10);
        const table = tables.find((t) => t.number === num);
        if (table && table.status === 'reserved') {
          await updateTableStatus(table.id, 'available');
        }
      }
    }
    toast.success(t('restaurant.statusCompleted', 'Completed'));
    onClose();
  };

  const tableDisplayName = reservation.tableId
    ? `${t('restaurant.tableLabel', 'Table')} ${reservation.tableId.replace(/[^0-9]/g, '')}`
    : t('restaurant.noTableAssigned', 'No table assigned');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      icon={<Calendar className="size-5" />}
      iconVariant="orange"
      title={reservation.guestName}
      subtitle={`${t('restaurant.reservationDetails', 'Reservation Details')} • #${reservation.id}`}
      footer={
        <ModalFooter
          showSubmit={false}
          onCancel={onClose}
          cancelLabel={t('common.close', 'Close')}
          extraActions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(reservation);
                }}
                className="h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="size-3.5" />
                <span>{t('common.edit', 'Edit')}</span>
              </button>
              {reservation.status === 'upcoming' && (
                <button
                  type="button"
                  onClick={handleSeatGuest}
                  className="h-8.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Utensils className="size-3.5" />
                  <span>{t('restaurant.markSeated', 'Seat Guests')}</span>
                </button>
              )}
              {reservation.status === 'seated' && (
                <button
                  type="button"
                  onClick={handleComplete}
                  className="h-8.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="size-3.5" />
                  <span>{t('restaurant.markCompleted', 'Complete')}</span>
                </button>
              )}
            </div>
          }
        />
      }
    >
      <div className="p-6 space-y-4 text-xs font-sans">
        {/* Status & Quick Overview Card */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${
                statusBadge[reservation.status] || ''
              }`}
            >
              {statusLabels[reservation.status] || reservation.status}
            </span>
            <span className="text-slate-500 font-medium">
              {tableDisplayName}
            </span>
          </div>

          <a
            href={`tel:${reservation.phone}`}
            className="flex items-center gap-1 font-semibold text-orange-600 hover:underline"
          >
            <Phone className="size-3.5" />
            <span>{reservation.phone}</span>
          </a>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Calendar className="size-3.5" />
              <span>{t('restaurant.date', 'Date')}</span>
            </div>
            <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              {reservation.date}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Clock className="size-3.5" />
              <span>{t('restaurant.time', 'Time')}</span>
            </div>
            <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              {reservation.time}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Users className="size-3.5" />
              <span>{t('restaurant.partySize', 'Party Size')}</span>
            </div>
            <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              {reservation.partySize} {t('restaurant.guestsUnit', 'guests')}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="text-slate-400 font-medium flex items-center gap-1.5 mb-1">
              <Clock className="size-3.5" />
              <span>{t('restaurant.duration', 'Duration')}</span>
            </div>
            <div className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              {reservation.durationMinutes} {t('restaurant.minutesUnit', 'min')}
            </div>
          </div>
        </div>

        {/* Special Notes */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
          <div className="text-slate-400 font-medium flex items-center gap-1.5">
            <FileText className="size-3.5" />
            <span>{t('restaurant.specialNotes', 'Notes')}</span>
          </div>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            {reservation.notes || t('restaurant.noNotes', 'No special notes')}
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ReservationDetailsModal;
