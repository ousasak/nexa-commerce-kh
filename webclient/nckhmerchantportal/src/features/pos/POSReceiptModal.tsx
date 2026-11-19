import React, { useRef } from 'react';
import { FiCheckCircle, FiPrinter, FiPlus } from 'react-icons/fi';
import { OrderSuccessState } from './types';
import { formatUSD, formatKHR } from './posUtils';
import { useLanguage } from '../../i18n';
import { Modal, ModalFooter } from '../../components/ui';
import { Order } from '../../types';
import ReceiptPrintDocument from '../orders/ReceiptPrintDocument';
import { printDocumentHtml } from '../../utils/printDocument';

interface POSReceiptModalProps {
  orderSuccess: OrderSuccessState | null;
  onNewOrder: () => void;
  isKhmer: boolean;
}

export const POSReceiptModal: React.FC<POSReceiptModalProps> = ({
  orderSuccess,
  onNewOrder,
  isKhmer,
}) => {
  const { t } = useLanguage();
  const printRenderRef = useRef<HTMLDivElement>(null);

  if (!orderSuccess) return null;

  const posOrder: Order = {
    id: orderSuccess.orderNumber,
    order_number: orderSuccess.orderNumber,
    total: orderSuccess.total,
    status: 'completed',
    items_total: orderSuccess.subtotal || orderSuccess.total,
    payment_method: orderSuccess.method,
    payment_status: 'paid',
    order_status: 'completed',
    currency: 'USD',
    customer_name: orderSuccess.customerName || (isKhmer ? 'អតិថិជនទូទៅ' : 'Walk-in Customer'),
    created_at: orderSuccess.createdAt || new Date().toISOString(),
    paid_at: orderSuccess.createdAt || new Date().toISOString(),
    items: (orderSuccess.items || []).map((it: any) => ({
      id: it.id,
      product_id: it.id,
      name: it.name,
      product_name: it.name,
      price: it.price,
      quantity: it.quantity,
    })),
  };

  const handlePrint = () => {
    const renderNode = printRenderRef.current;
    if (renderNode && renderNode.innerHTML.trim().length > 0) {
      printDocumentHtml(renderNode.innerHTML, {
        title: `POS Receipt #${orderSuccess.orderNumber}`,
      });
      return;
    }
    window.print();
  };

  return (
    <Modal
      isOpen={!!orderSuccess}
      onClose={onNewOrder}
      size="sm"
      icon={<FiCheckCircle className="size-5" />}
      iconVariant="emerald"
      title={t('pos.saleCompleted', 'Sale Completed!')}
      subtitle={`Order #${orderSuccess.orderNumber}${orderSuccess.table ? ` · ${orderSuccess.table}` : ''}`}
      footer={
        <ModalFooter
          showCancel={false}
          showSubmit={false}
          className="grid grid-cols-2 gap-2 p-4"
        >
          <button
            type="button"
            onClick={handlePrint}
            className="h-10 rounded-xl border border-border/80 dark:border-slate-700 bg-card dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-muted dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <FiPrinter className="size-4" />
            <span>{t('pos.printReceipt', 'Print Receipt')}</span>
          </button>

          <button
            type="button"
            onClick={onNewOrder}
            style={{
              backgroundColor: 'var(--btn-primary-hex, var(--primary-hex, #ec4899))',
            }}
            className="h-10 rounded-xl hover:brightness-90 text-white text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
          >
            <FiPlus className="size-4" />
            <span>{t('pos.newOrderBtn', 'New Order')}</span>
          </button>
        </ModalFooter>
      }
    >
      <div className="p-5 space-y-4">
        {/* Receipt Summary Card */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-left space-y-2 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>{t('pos.paymentMethod', 'Payment Method')}:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 capitalize">
              {orderSuccess.method === 'cash' ? t('pos.cash', 'Cash') : orderSuccess.method === 'khqr' ? t('pos.khqr', 'KHQR') : orderSuccess.method}
            </span>
          </div>

          {orderSuccess.items && orderSuccess.items.length > 0 && (
            <div className="py-2 border-y border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
              {orderSuccess.items.map((i, idx) => (
                <div key={idx} className="flex justify-between text-[11px]">
                  <span className="text-slate-600 dark:text-slate-400">
                    {i.quantity}x {i.name}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatUSD(i.price * i.quantity)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-baseline font-bold text-slate-900 dark:text-slate-100">
            <span>{t('pos.totalPaid', 'Total Paid')}:</span>
            <div className="text-right">
              <span className="text-base text-emerald-600 dark:text-emerald-400 block font-black">
                {formatUSD(orderSuccess.total)}
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                {formatKHR(orderSuccess.total)}
              </span>
            </div>
          </div>
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
          <ReceiptPrintDocument order={posOrder} />
        </div>
      </div>
    </Modal>
  );
};

export default POSReceiptModal;
