import React, { useState, useEffect } from 'react';
import {
  MoreHorizontal,
  Edit2,
  Trash2,
  Eye,
  Plus,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Download,
  DollarSign,
  Calendar,
  ShoppingBag,
  TrendingUp,
  Clock,
  Send,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Award,
  Sparkles,
  CheckCircle2,
  User,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Customer } from './customer.types';
import { useLanguage } from '../../i18n';
import { GlobalFormat } from '../../utils/GlobalFormat';
import { DeleteConfirmDialog } from '../../components/common/DeleteConfirmDialog';
import { customerService } from '../../services/customerService';

interface CustomerRowActionsProps {
  customer: Customer;
  isOpen: boolean;
  onToggle: () => void;
  onView: (c: Customer) => void;
  onEdit: (c: Customer) => void;
  onDelete: (c: Customer) => void;
}

export const CustomerRowActions: React.FC<CustomerRowActionsProps> = ({
  customer,
  isOpen,
  onToggle,
  onView,
  onEdit,
  onDelete,
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
        <div className="absolute right-0 top-10.5 z-30 w-44 py-1.5 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-100 font-sans">
          <button
            type="button"
            onClick={() => {
              onToggle();
              onView(customer);
            }}
            className="w-full px-3.5 py-2 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
          >
            <Eye className="size-4 text-slate-400" />
            <span>{t('customers.viewDetails', t('common.view', 'View Details'))}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onToggle();
              onEdit(customer);
            }}
            className="w-full px-3.5 py-2 text-sm text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
          >
            <Edit2 className="size-4 text-slate-400" />
            <span>{t('customers.edit', t('common.edit', 'Edit'))}</span>
          </button>
          <div className="my-1 border-t border-slate-100 dark:border-slate-700/60" />
          <button
            type="button"
            onClick={() => {
              onToggle();
              onDelete(customer);
            }}
            className="w-full px-3.5 py-2 text-sm text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 cursor-pointer font-medium transition-colors"
          >
            <Trash2 className="size-4" />
            <span>{t('customers.delete', t('common.delete', 'Delete'))}</span>
          </button>
        </div>
      )}
    </div>
  );
};

interface CustomerHeaderActionsProps {
  onAdd: () => void;
  onExport?: () => void;
}

export const CustomerHeaderActions: React.FC<CustomerHeaderActionsProps> = ({ onAdd, onExport }) => {
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-2.5">
      {onExport && (
        <button
          type="button"
          onClick={onExport}
          className="h-10 sm:h-10.5 px-4 rounded-xl border border-[#dfe7df] dark:border-[#2a4245] bg-white dark:bg-[#142629] text-sm font-semibold text-[#16292e] dark:text-[#e7ede9] hover:bg-[#f7f8f2] dark:hover:bg-[#1b3438] flex items-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-95"
        >
          <Download className="size-4 text-[#71817e]" />
          <span>{t('customers.export', t('common.export', 'Export'))}</span>
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
        <span>{t('customers.addCustomer', 'Add Customer')}</span>
      </button>
    </div>
  );
};

interface CustomerDeleteDialogProps {
  customer: Customer | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const CustomerDeleteDialog: React.FC<CustomerDeleteDialogProps> = ({
  customer,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  const { t } = useLanguage();

  return (
    <DeleteConfirmDialog
      open={Boolean(customer)}
      title={t('customers.confirmDeleteTitle', 'Delete Customer?')}
      description={
        customer?.name
          ? t(
              'customers.confirmDeleteNamedDesc',
              `Are you sure you want to delete customer "${customer.name}"? This action cannot be undone.`,
              { name: customer.name }
            )
          : t(
              'customers.confirmDeleteDesc',
              'Are you sure you want to delete this customer? This action cannot be undone.'
            )
      }
      isDeleting={isDeleting}
      cancelLabel={t('common.cancel', 'Cancel')}
      deleteLabel={t('common.delete', 'Delete')}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
};

interface CustomerDetailModalProps {
  customer: Customer | null;
  onClose: () => void;
  onEdit: (c: Customer) => void;
}

// Avatar color palette for consistent styling
const getCustomerAvatarStyle = (name: string) => {
  const styles = [
    'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  ];
  const charCode = name ? name.charCodeAt(0) : 0;
  return styles[charCode % styles.length];
};

const getCustomerInitials = (name?: string) => {
  if (!name || !name.trim()) return 'C';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  onClose,
  onEdit,
}) => {
  const { t, isKhmer } = useLanguage();
  const [fullCustomer, setFullCustomer] = useState<Customer | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (customer?.id) {
      setLoadingDetails(true);
      customerService
        .get(customer.id)
        .then((data) => setFullCustomer(data))
        .catch((err) => {
          console.warn('Could not fetch full customer details:', err);
          setFullCustomer(customer);
        })
        .finally(() => setLoadingDetails(false));
    } else {
      setFullCustomer(null);
    }
  }, [customer?.id]);

  if (!customer) return null;

  const active = fullCustomer || customer;
  const orders = fullCustomer?.orders || [];
  const orderCount = orders.length > 0 ? orders.length : (active.total_orders ?? active.order_count ?? 0);
  const totalSpent = Number(
    active.total_spent ??
      orders
        .filter((o: any) => o.payment_status === 'paid')
        .reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0)
  );
  const avatarStyle = getCustomerAvatarStyle(active.name || '');
  const initials = getCustomerInitials(active.name);

  const handleCopy = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const rawTelegram = active.telegram || active.telegram_username || '';
  const cleanTelegram = rawTelegram.replace(/^@/, '').trim();

  return (
    <Dialog open={Boolean(customer)} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] md:max-w-[560px] p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-h-[88vh] flex flex-col font-sans">
        {/* ─── 1. Header (Clean & Focused) ─── */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`size-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${avatarStyle}`}
            >
              {initials}
            </div>
            <div className="space-y-0.5 min-w-0">
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white truncate">
                {active.name || t('customers.unnamed', 'Unnamed Customer')}
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {active.phone || active.email || t('customers.customer', 'Customer')}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* ─── 2. Scrollable Body Content ─── */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Core Metrics: Total Orders & Total Spent */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-0.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] uppercase font-bold tracking-wider">
                  {t('customers.totalOrders', 'Total Orders')}
                </span>
                <ShoppingBag className="size-3.5 text-blue-500" />
              </div>
              <div className="font-black text-xl text-slate-900 dark:text-white">
                {orderCount}
              </div>
              <span className="text-[11px] text-slate-400 block">
                {orderCount} {t('customers.ordersCount', 'orders')}
              </span>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-0.5">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] uppercase font-bold tracking-wider">
                  {t('customers.totalSpent', 'Total Spent')}
                </span>
                <DollarSign className="size-3.5 text-emerald-500" />
              </div>
              <div className="font-black text-xl text-emerald-600 dark:text-emerald-400 font-mono">
                {GlobalFormat.currency(totalSpent)}
              </div>
              <span className="text-[11px] text-slate-400 block font-mono">
                ៛{new Intl.NumberFormat('en-US').format(Math.round(totalSpent * 4100))}
              </span>
            </div>
          </div>

          {/* Contact Details (Only non-empty fields) */}
          {(active.phone || cleanTelegram || active.email || active.address || active.city) && (
            <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-2">
              {active.phone && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 text-xs min-w-0">
                    <Phone className="size-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold truncate">
                      {active.phone}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(active.phone!, 'phone')}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title={t('customers.copied', 'Copy')}
                  >
                    {copiedField === 'phone' ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </div>
              )}

              {cleanTelegram && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 text-xs min-w-0">
                    <Send className="size-3.5 text-sky-500 shrink-0" />
                    <a
                      href={`https://t.me/${cleanTelegram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sky-600 dark:text-sky-400 hover:underline truncate"
                    >
                      @{cleanTelegram}
                    </a>
                  </div>
                </div>
              )}

              {active.email && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 text-xs min-w-0">
                    <Mail className="size-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300 truncate">
                      {active.email}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(active.email!, 'email')}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title={t('customers.copied', 'Copy')}
                  >
                    {copiedField === 'email' ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </div>
              )}

              {(active.address || active.city) && (
                <div className="flex items-start gap-2.5 text-xs">
                  <MapPin className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-slate-700 dark:text-slate-300">
                    {[active.address, active.city].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Internal Notes (Only if exists) */}
          {active.notes && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                {t('customers.internalNotes', 'Notes')}
              </span>
              <p className="leading-relaxed">{active.notes}</p>
            </div>
          )}

          {/* ─── 3. Order History Section ─── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {t('customers.orderHistory', 'Order History')}
              </h4>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
                {orders.length} {t('customers.ordersCount', 'orders')}
              </span>
            </div>

            {loadingDetails ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span className="text-xs">{t('common.loading', 'Loading...')}</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-5 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1 bg-slate-50/50 dark:bg-slate-900/30">
                <ShoppingBag className="size-5 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t('customers.noOrderHistory', 'No purchase history recorded yet')}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {orders.map((order: any) => {
                  const isPaid = order.payment_status === 'paid';
                  const orderNum = order.order_number || `#${order.id}`;
                  const items = order.items || [];
                  const itemsPreview = items.length > 0
                    ? items
                        .slice(0, 3)
                        .map((it: any) => `${it.product_name || it.name || 'Item'} (x${it.quantity || 1})`)
                        .join(', ') + (items.length > 3 ? ` +${items.length - 3}` : '')
                    : null;

                  return (
                    <div
                      key={order.id}
                      className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                            {orderNum}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {order.created_at ? GlobalFormat.date(order.created_at) : '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              isPaid
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {isPaid ? (isKhmer ? 'បានទូទាត់' : 'Paid') : (order.payment_status || 'Pending')}
                          </span>
                          <span className="font-bold text-xs text-slate-900 dark:text-white font-mono">
                            {GlobalFormat.currency(order.total || 0)}
                          </span>
                        </div>
                      </div>

                      {itemsPreview && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {itemsPreview}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── 4. Modal Footer Actions ─── */}
        <DialogFooter className="p-3.5 sm:p-4 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            {t('customers.close', t('common.close', 'Close'))}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onClose();
              onEdit(active);
            }}
            style={{
              backgroundColor: 'var(--btn-primary-hex, var(--primary-hex, #ec4899))',
            }}
            className="hover:brightness-90 text-white text-xs gap-1.5"
          >
            <Edit2 className="size-3" />
            <span>{t('customers.edit', t('common.edit', 'Edit'))}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerRowActions;
