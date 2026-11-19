import React from 'react';
import { Eye } from 'lucide-react';
import { KitchenOrder } from './order.types';
import { OrderDetailsModal } from './OrderDetailsModal';
import { useLanguage } from '../../i18n';

interface OrderRowActionsProps {
  order: KitchenOrder;
  onView: (order: KitchenOrder) => void;
}

export const OrderRowActions: React.FC<OrderRowActionsProps> = ({ order, onView }) => {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={() => onView(order)}
      className="inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs active:scale-95"
      title={t('common.view', 'View Details')}
    >
      <Eye className="size-4.5" />
    </button>
  );
};

interface OrderModalActionProps {
  order: KitchenOrder | null;
  onClose: () => void;
}

export const OrderModalAction: React.FC<OrderModalActionProps> = ({ order, onClose }) => {
  if (!order) return null;
  return <OrderDetailsModal isOpen={Boolean(order)} order={order} onClose={onClose} />;
};

export default OrderRowActions;
