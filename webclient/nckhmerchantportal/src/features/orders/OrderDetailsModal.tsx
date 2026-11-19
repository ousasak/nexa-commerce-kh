import React, { useRef } from 'react';
import { Utensils, ShoppingBag, Bike, Calendar, Clock, DollarSign, Printer, CheckCircle } from 'lucide-react';
import { KitchenOrder } from '../../types/restaurant';
import { useLanguage } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import { Modal, ModalFooter } from '../../components/ui';
import { GlobalPrintDocument, GlobalPrintColumn } from '../../components/common/GlobalPrintDocument';
import { printDocumentHtml } from '../../utils/printDocument';

interface OrderDetailsModalProps {
  order: KitchenOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, isOpen, onClose }) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const printRenderRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    const renderNode = printRenderRef.current;
    if (renderNode && renderNode.innerHTML.trim().length > 0) {
      printDocumentHtml(renderNode.innerHTML, {
        title: `Kitchen Ticket #${order.id}`,
      });
      return;
    }
    window.print();
  };

  const statusBadge = {
    new: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    preparing: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    ready: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    served: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    cancelled: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  }[order.status];

  return (
    <Modal
      isOpen={isOpen && !!order}
      onClose={onClose}
      size="lg"
      icon={<span className="font-bold font-mono text-sm">{order.id}</span>}
      iconVariant="orange"
      title={`Order ${order.id}`}
      badge={
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border capitalize ${statusBadge}`}>
          {order.status}
        </span>
      }
      subtitle={order.placedAt}
      footer={
        <ModalFooter
          onCancel={onClose}
          cancelLabel={t('common.close', 'Close')}
          showSubmit={false}
          extraActions={
            <button
              type="button"
              onClick={handlePrint}
              className="h-10 px-4 rounded-xl border border-border/80 dark:border-slate-700 hover:bg-muted dark:hover:bg-slate-800 text-xs sm:text-[13px] font-bold text-muted-foreground dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="size-4" />
              <span>{t('restaurant.printTicket', 'Print Ticket')}</span>
            </button>
          }
        />
      }
    >
      <div className="p-6 space-y-4">
        {/* Order Meta Info Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[11px] text-slate-400 block">{t('restaurant.orderType', 'Order Type')}</span>
            <div className="flex items-center gap-1 mt-0.5 font-semibold text-xs text-slate-800 dark:text-white capitalize">
              {order.type === 'dine-in' && <Utensils className="size-3 text-orange-500" />}
              {order.type === 'takeaway' && <ShoppingBag className="size-3 text-sky-500" />}
              {order.type === 'delivery' && <Bike className="size-3 text-emerald-500" />}
              <span>{order.type}</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">{t('restaurant.tableOrCustomer', 'Table / Customer')}</span>
            <span className="font-semibold text-xs text-slate-800 dark:text-white mt-0.5 block">
              {order.tableNumber || order.customerName || 'Walk-in Guest'}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 block">{t('restaurant.channel', 'Channel')}</span>
            <span className="font-semibold text-xs text-slate-800 dark:text-white mt-0.5 block uppercase">
              POS
            </span>
          </div>
        </div>

        {/* Items List */}
        <div>
          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
            {t('restaurant.orderedItems', 'Ordered Items')} ({order.items.length})
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
            {order.items.map((item, idx) => (
              <div key={idx} className="p-3 bg-white dark:bg-slate-800/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="size-6 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 font-bold text-xs flex items-center justify-center">
                    {item.quantity}x
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {item.name}
                    </p>
                    {item.options && item.options.length > 0 && (
                      <p className="text-[11px] text-orange-600 dark:text-orange-400 italic">
                        {item.options.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                    ${((item.price || 0) * item.quantity).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary Total */}
        <div className="pt-2 flex justify-between items-center text-sm font-bold border-t border-slate-100 dark:border-slate-800">
          <span className="text-slate-700 dark:text-slate-300">{t('restaurant.totalAmount', 'Total Amount')}:</span>
          <span className="text-base font-mono text-orange-600 dark:text-orange-400">
            ${order.total?.toFixed(2) || '0.00'}
          </span>
        </div>

        {/* Hidden Print Staging Stage */}
        <div
          ref={printRenderRef}
          style={{
            position: 'fixed',
            top: '-99999px',
            left: '-99999px',
            width: '210mm',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: -9999,
          }}
          aria-hidden="true"
        >
          <GlobalPrintDocument
            language={language}
            store={{
              name: (user as any)?.shop_name || (user as any)?.shop?.name || user?.username || 'Restro Food & Coffee KH',
              tagline: language === 'kh' ? 'ភោជនីយដ្ឋាន និងហាងកាហ្វេ' : 'Restaurant & Coffee Bar',
              phone: (user as any)?.shop?.contact || '+855 (0) 23 888 888',
              address: (user as any)?.shop?.address || (language === 'kh' ? 'រាជធានីភ្នំពេញ' : 'Phnom Penh'),
            }}
            document={{
              title: language === 'kh' ? 'ប័ណ្ណកុម្ម៉ង់ផ្ទះបាយ / សំបុត្រតុ' : 'Kitchen Order Ticket',
              subtitle: language === 'kh' ? 'បង្កាន់ដៃបញ្ជាទិញបន្ទាន់' : 'Live Kitchen Ticket',
              referenceNumber: `#${order.id}`,
              date: order.placedAt || new Date().toLocaleString(),
              statusBadge: {
                text: order.status,
                variant: 'completed',
              },
              channelLabel: order.type || 'Dine-In',
            }}
            infoCards={[
              {
                title: language === 'kh' ? 'ព័ត៌មានតុ / ការកុម្ម៉ង់' : 'Order Information',
                badge: order.type,
                rows: [
                  { label: language === 'kh' ? 'លេខតុ៖' : 'Table #:', value: order.tableNumber || '—' },
                  { label: language === 'kh' ? 'ប្រភេទ៖' : 'Type:', value: order.type },
                  { label: language === 'kh' ? 'អតិថិជន៖' : 'Customer:', value: order.customerName || (language === 'kh' ? 'អតិថិជនទូទៅ' : 'Walk-in') },
                ],
              },
              {
                title: language === 'kh' ? 'ព័ត៌មានប្រតិបត្តិការ' : 'Ticket Details',
                rows: [
                  { label: language === 'kh' ? 'លេខសំបុត្រ៖' : 'Ticket ID:', value: `#${order.id}` },
                  { label: language === 'kh' ? 'ពេលវេលា៖' : 'Time:', value: order.placedAt || '—' },
                  { label: language === 'kh' ? 'ស្ថានភាព៖' : 'Status:', value: order.status },
                ],
              },
            ]}
            columns={[
              { key: 'idx', title: '#', align: 'center', width: 'w-10', render: (_, i) => <span>{i + 1}</span> },
              {
                key: 'name',
                title: language === 'kh' ? 'ឈ្មោះម្ហូប / ភេសជ្ជៈ' : 'Item Description',
                align: 'left',
                render: (it) => (
                  <div>
                    <span className="font-bold text-slate-900">{it.name}</span>
                    {it.options && it.options.length > 0 && (
                      <span className="text-[8.5px] text-orange-600 block italic">({it.options.join(', ')})</span>
                    )}
                  </div>
                ),
              },
              { key: 'quantity', title: language === 'kh' ? 'ចំនួន' : 'Qty', align: 'center' },
              {
                key: 'price',
                title: language === 'kh' ? 'តម្លៃឯកតា' : 'Unit Price',
                align: 'right',
                render: (it) => <span>${Number(it.price || 0).toFixed(2)}</span>,
              },
              {
                key: 'total',
                title: language === 'kh' ? 'សរុប' : 'Total',
                align: 'right',
                render: (it) => {
                  const tot = (it.price || 0) * (it.quantity || 1);
                  return <span className="font-bold text-slate-900">${tot.toFixed(2)}</span>;
                },
              },
            ]}
            rows={order.items || []}
            summary={{
              notesTitle: language === 'kh' ? 'កំណត់ចំណាំចុងភៅ' : 'Kitchen Instructions',
              notesText: language === 'kh' ? '* សូមរៀបចំម្ហូបតាមលំដាប់លំដោយ និងត្រួតពិនិត្យឱ្យបានម៉ត់ចត់មុនពេលលើកជូនភ្ញៀវ។' : '* Please prepare dishes promptly according to kitchen standards.',
              rows: [
                {
                  label: language === 'kh' ? 'សរុបរួម (Grand Total):' : 'Grand Total:',
                  valueUsd: order.total || 0,
                  isTotal: true,
                },
              ],
            }}
          />
        </div>
      </div>
    </Modal>
  );
};

export default OrderDetailsModal;
