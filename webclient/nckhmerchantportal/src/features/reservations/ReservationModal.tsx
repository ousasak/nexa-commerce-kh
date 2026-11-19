import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Phone,
  User,
  FileText,
  Utensils,
  Check,
} from 'lucide-react';
import { useRestaurantStore } from '../../stores/restaurantStore';
import { Reservation, ReservationStatus } from '../../types/restaurant';
import { useLanguage } from '../../i18n';
import toast from '../../utils/toast';
import { Modal, ModalFooter } from '../../components/ui';

export interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation?: Reservation | null;
  defaultTableId?: string;
  defaultTableNumber?: number;
}

const DURATION_PILLS = [60, 90, 120, 150, 180];

const STATUS_LIST: ReservationStatus[] = [
  'upcoming',
  'seated',
  'completed',
  'cancelled',
];

const STATUS_STYLES: Record<ReservationStatus, { active: string; inactive: string }> = {
  upcoming: {
    active: 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 font-bold shadow-xs',
    inactive: 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-sky-300',
  },
  seated: {
    active: 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-bold shadow-xs',
    inactive: 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300',
  },
  completed: {
    active: 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold shadow-xs',
    inactive: 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-300',
  },
  cancelled: {
    active: 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold shadow-xs',
    inactive: 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-rose-300',
  },
};

export const ReservationModal: React.FC<ReservationModalProps> = ({
  isOpen,
  onClose,
  reservation,
  defaultTableId,
  defaultTableNumber,
}) => {
  const { tables, selectedDate, addReservation, updateReservation, updateTableStatus } =
    useRestaurantStore();
  const { t } = useLanguage();

  const isEditing = Boolean(reservation);

  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [date, setDate] = useState('2026-10-02');
  const [time, setTime] = useState('19:30');
  const [partySize, setPartySize] = useState('2');
  const [tableId, setTableId] = useState('Table 1');
  const [durationMinutes, setDurationMinutes] = useState('90');
  const [status, setStatus] = useState<ReservationStatus>('upcoming');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const statusLabels: Record<ReservationStatus, string> = {
    upcoming: t('restaurant.statusUpcoming', 'Upcoming'),
    seated: t('restaurant.statusSeated', 'Seated'),
    completed: t('restaurant.statusCompleted', 'Completed'),
    cancelled: t('restaurant.statusCancelled', 'Cancelled'),
  };

  useEffect(() => {
    if (!isOpen) return;

    if (reservation) {
      setGuestName(reservation.guestName || '');
      setPhone(reservation.phone || '');
      setDate(reservation.date || selectedDate || '2026-10-02');
      setTime(reservation.time || '19:30');
      setPartySize(String(reservation.partySize || 2));
      setTableId(reservation.tableId || defaultTableId || (tables[0] ? `Table ${tables[0].number}` : 'Table 1'));
      setDurationMinutes(String(reservation.durationMinutes || 90));
      setStatus(reservation.status || 'upcoming');
      setNotes(reservation.notes || '');
    } else {
      setGuestName('');
      setPhone('');
      setDate(selectedDate || '2026-10-02');
      setTime('19:30');
      setPartySize('2');
      const fallbackTable = defaultTableNumber
        ? `Table ${defaultTableNumber}`
        : defaultTableId || (tables[0] ? `Table ${tables[0].number}` : 'Table 1');
      setTableId(fallbackTable);
      setDurationMinutes('90');
      setStatus('upcoming');
      setNotes('');
    }
    setErrors({});
  }, [isOpen, reservation, selectedDate, defaultTableId, defaultTableNumber, tables]);

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (!guestName.trim()) {
      newErrors.guestName = t('restaurant.guestNameRequired', 'Guest name is required');
    }
    if (!phone.trim()) {
      newErrors.phone = t('restaurant.phoneRequired', 'Phone number is required');
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      toast.error(firstError);
      return;
    }

    const pSize = parseInt(partySize, 10) || 2;
    const dur = parseInt(durationMinutes, 10) || 90;

    if (isEditing && reservation) {
      await updateReservation(reservation.id, {
        guestName: guestName.trim(),
        phone: phone.trim(),
        date,
        time,
        dateTime: `${date}, ${time}`,
        partySize: pSize,
        tableId,
        durationMinutes: dur,
        status,
        notes: notes.trim() || undefined,
      });

      // Synchronize table status
      const matchNum = tableId.match(/\d+/);
      if (matchNum) {
        const num = parseInt(matchNum[0], 10);
        const targetTable = tables.find((tbl) => tbl.number === num);
        if (targetTable) {
          if (status === 'seated') {
            await updateTableStatus(targetTable.id, 'occupied', {
              reservedFor: guestName,
              reservationTime: time,
            });
          } else if (status === 'completed' || status === 'cancelled') {
            await updateTableStatus(targetTable.id, 'available');
          }
        }
      }

      toast.success(t('restaurant.reservationUpdated', 'Reservation updated successfully!'));
    } else {
      await addReservation({
        guestName: guestName.trim(),
        phone: phone.trim(),
        date,
        time,
        dateTime: `${date}, ${time}`,
        partySize: pSize,
        tableId,
        durationMinutes: dur,
        status: 'upcoming',
        notes: notes.trim() || undefined,
      });

      toast.success(t('restaurant.reservationCreated', 'Reservation created successfully!'));
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      icon={<Calendar className="size-5" />}
      iconVariant="orange"
      title={
        isEditing
          ? t('restaurant.editReservation', 'Edit Reservation')
          : t('restaurant.newReservation', 'New Reservation')
      }
      subtitle={
        isEditing
          ? t('restaurant.editReservationSubtitle', 'Update guest details, assigned table, or reservation schedule')
          : t('restaurant.bookTableSubtitle', 'Book a table for upcoming restaurant guests')
      }
      footer={
        <ModalFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          cancelLabel={t('common.cancel', 'Cancel')}
          submitLabel={
            isEditing
              ? t('restaurant.saveChanges', 'Save Changes')
              : t('restaurant.confirmReservation', 'Confirm Reservation')
          }
          confirmIcon={<Calendar className="size-3.5" />}
        />
      }
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4 font-sans text-left">
        {/* Row 1: Guest Name & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="size-3.5 text-slate-400" />
              <span>{t('restaurant.guestName', 'Guest Name')}</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={guestName}
              onChange={(e) => {
                setGuestName(e.target.value);
                if (errors.guestName) setErrors((prev) => ({ ...prev, guestName: '' }));
              }}
              placeholder="e.g. Sophy Chen"
              className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                errors.guestName
                  ? 'border-rose-400 focus:ring-rose-400/20'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-orange-500/30'
              }`}
            />
            {errors.guestName && (
              <p className="text-rose-500 text-xs mt-1">{errors.guestName}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="size-3.5 text-slate-400" />
              <span>{t('restaurant.phone', 'Phone Number')}</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
              }}
              placeholder="e.g. +855 12 889 900"
              className={`w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                errors.phone
                  ? 'border-rose-400 focus:ring-rose-400/20'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-orange-500/30'
              }`}
            />
            {errors.phone && (
              <p className="text-rose-500 text-xs mt-1">{errors.phone}</p>
            )}
          </div>
        </div>

        {/* Row 2: Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="size-3.5 text-slate-400" />
              <span>{t('restaurant.date', 'Date')}</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="size-3.5 text-slate-400" />
              <span>{t('restaurant.time', 'Time')}</span>
              <span className="text-rose-500">*</span>
            </label>
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
          </div>
        </div>

        {/* Row 3: Party Size & Table Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Users className="size-3.5 text-slate-400" />
              <span>{t('restaurant.partySize', 'Number of Guests')}</span>
              <span className="text-rose-500">*</span>
            </label>
            <select
              value={partySize}
              onChange={(e) => setPartySize(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 20].map((num) => (
                <option key={num} value={num}>
                  {num} {t('restaurant.guestsUnit', 'guests')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Utensils className="size-3.5 text-slate-400" />
              <span>{t('restaurant.assignedTable', 'Assigned Table')}</span>
            </label>
            <select
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            >
              {tables.map((tbl) => (
                <option key={tbl.id} value={`Table ${tbl.number}`}>
                  {t('restaurant.tableLabel', 'Table')} {tbl.number} ({tbl.section} • {tbl.seats || 2} {t('restaurant.seats', 'seats')})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 4: Estimated Duration with Quick Pills */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="size-3.5 text-slate-400" />
              <span>{t('restaurant.duration', 'Estimated Duration')}</span>
            </label>
            <span className="text-[11px] font-mono text-slate-400">
              {durationMinutes} {t('restaurant.minutesUnit', 'min')}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {DURATION_PILLS.map((mins) => {
              const isSelected = durationMinutes === String(mins);
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(String(mins))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-orange-300'
                  }`}
                >
                  {mins} {t('restaurant.minutesUnit', 'min')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 5: Status Selection (Active in Edit Mode) */}
        {isEditing && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('restaurant.status', 'Status')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STATUS_LIST.map((st) => {
                const isSelected = status === st;
                const styleObj = STATUS_STYLES[st];
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`py-2 px-3 rounded-xl border text-xs text-center transition-all cursor-pointer ${
                      isSelected ? styleObj.active : styleObj.inactive
                    }`}
                  >
                    {statusLabels[st]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Row 6: Special Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <FileText className="size-3.5 text-slate-400" />
            <span>{t('restaurant.specialNotes', 'Special Notes (Optional)')}</span>
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('restaurant.notesPlaceholder', 'Special requests, dietary requirements…')}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
          />
        </div>
      </form>
    </Modal>
  );
};

export default ReservationModal;

