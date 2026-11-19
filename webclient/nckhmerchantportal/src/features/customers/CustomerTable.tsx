import React from 'react';
import {
  ArrowUpDown,
  User,
  Users,
  MessageSquare,
} from 'lucide-react';
import { Customer } from './customer.types';
import { CustomerRowActions } from './CustomerActions';
import { useLanguage } from '../../i18n';
import { GlobalFormat } from '../../utils/GlobalFormat';
import { Pagination } from '../../components/common/Pagination';

interface CustomerTableProps {
  customers: Customer[];
  totalEntries: number;
  loading: boolean;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  sortAsc: boolean;
  sortField: 'index' | 'name' | 'orders' | 'spent' | 'date';
  visibleColumns: Record<string, boolean>;
  openDropdownId: number | string | null;
  onSort: (field: 'index' | 'name' | 'orders' | 'spent' | 'date') => void;
  onDropdownToggle: (id: number | string) => void;
  onView: (c: Customer) => void;
  onEdit: (c: Customer) => void;
  onDelete: (c: Customer) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

// Consistent avatar background styling generator
const getAvatarStyle = (name: string) => {
  const styles = [
    'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  ];
  let hash = 0;
  const str = name || '';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return styles[Math.abs(hash) % styles.length];
};

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  totalEntries,
  loading,
  currentPage,
  pageSize,
  totalPages,
  sortAsc,
  sortField,
  visibleColumns,
  openDropdownId,
  onSort,
  onDropdownToggle,
  onView,
  onEdit,
  onDelete,
  onPageChange,
  onPageSizeChange,
}) => {
  const { t } = useLanguage();

  return (
    <div className="rounded-xl border border-[#dfe7df] dark:border-[#2a4245] bg-white dark:bg-[#142629] shadow-panel overflow-hidden font-sans">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[#dfe7df] dark:border-[#2a4245] bg-[#f7f8f2]/90 dark:bg-[#17282b]/90 text-[#71817e] dark:text-[#a0b0ad] font-bold uppercase tracking-wider text-xs">
              <th className="py-3.5 px-4 w-12">#</th>
              <th className="py-3.5 px-4 min-w-[200px]">
                <button
                  type="button"
                  onClick={() => onSort('name')}
                  className="flex items-center gap-1.5 hover:text-[#16292e] dark:hover:text-[#e7ede9] transition-colors cursor-pointer"
                >
                  <span>{t('customers.customer', 'Customer')}</span>
                  <ArrowUpDown className="size-3.5 text-[#71817e]" />
                </button>
              </th>
              {visibleColumns.phone && (
                <th className="py-3.5 px-4 min-w-[130px]">{t('customers.phone', 'Phone')}</th>
              )}
              {visibleColumns.telegram && (
                <th className="py-3.5 px-4 min-w-[130px]">{t('customers.telegram', 'Telegram')}</th>
              )}
              {visibleColumns.orders && (
                <th className="py-3.5 px-4 min-w-[120px] whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onSort('orders')}
                    className="flex items-center gap-1.5 whitespace-nowrap hover:text-[#16292e] dark:hover:text-[#e7ede9] transition-colors cursor-pointer"
                  >
                    <span className="whitespace-nowrap">{t('customers.orders', 'Orders')}</span>
                    <ArrowUpDown className="size-3.5 text-[#71817e] shrink-0" />
                  </button>
                </th>
              )}
              {visibleColumns.spent && (
                <th className="py-3.5 px-4 min-w-[135px] whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onSort('spent')}
                    className="flex items-center gap-1.5 whitespace-nowrap hover:text-[#16292e] dark:hover:text-[#e7ede9] transition-colors cursor-pointer"
                  >
                    <span className="whitespace-nowrap">{t('customers.spent', 'Spent')}</span>
                    <ArrowUpDown className="size-3.5 text-[#71817e] shrink-0" />
                  </button>
                </th>
              )}
              {visibleColumns.createdAt && (
                <th className="py-3.5 px-4 min-w-[125px] whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onSort('date')}
                    className="flex items-center gap-1.5 whitespace-nowrap hover:text-[#16292e] dark:hover:text-[#e7ede9] transition-colors cursor-pointer"
                  >
                    <span className="whitespace-nowrap">{t('customers.joined', 'Joined')}</span>
                    <ArrowUpDown className="size-3.5 text-[#71817e] shrink-0" />
                  </button>
                </th>
              )}
              <th className="py-3.5 px-4 w-16 text-right whitespace-nowrap">{t('customers.actions', t('common.actions', 'Actions'))}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#dfe7df]/60 dark:divide-[#2a4245]/60">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#71817e]">
                  <div className="flex flex-col items-center gap-2">
                    <div className="size-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">{t('customers.loading', t('common.loading', 'Loading customers...'))}</span>
                  </div>
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-[#71817e]">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="size-8 text-[#818f8b] stroke-[1.5]" />
                    <span className="text-xs">{t('customers.noCustomersFound', 'No customers found')}</span>
                  </div>
                </td>
              </tr>
            ) : (
              customers.map((c, idx) => {
                const rowNum = (currentPage - 1) * pageSize + idx + 1;
                const orderCount = c.total_orders ?? c.order_count ?? 0;
                const totalSpent = c.total_spent ?? 0;

                return (
                  <tr
                    key={c.id}
                    className="hover:bg-[#f7f8f2]/80 dark:hover:bg-[#17282b]/80 transition-colors"
                  >
                    <td className="py-3.5 px-4 text-[#71817e] font-mono text-xs font-semibold">{rowNum}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`size-10 rounded-xl flex items-center justify-center font-bold text-sm uppercase shrink-0 border select-none transition-transform hover:scale-105 shadow-2xs ${getAvatarStyle(
                            c.name
                          )}`}
                        >
                          {c.name ? c.name.charAt(0) : <User className="size-4.5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[#16292e] dark:text-[#e7ede9] truncate text-sm">
                            {c.name || t('customers.unnamed', 'Unnamed')}
                          </div>
                          {c.email ? (
                            <div className="text-xs text-[#71817e] dark:text-slate-400 truncate mt-0.5">{c.email}</div>
                          ) : (
                            <div className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5 font-mono">
                              {c.phone ? GlobalFormat.phone(c.phone) : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {visibleColumns.phone && (
                      <td className="py-3.5 px-4 font-mono text-[#16292e] dark:text-[#e7ede9] text-sm whitespace-nowrap">
                        {c.phone ? GlobalFormat.phone(c.phone) : '—'}
                      </td>
                    )}
                    {visibleColumns.telegram && (
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {c.telegram ? (
                          <a
                            href={`https://t.me/${c.telegram.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 dark:text-sky-400 font-medium hover:underline transition-colors"
                          >
                            <MessageSquare className="size-3.5" />
                            <span>{c.telegram.startsWith('@') ? c.telegram : `@${c.telegram}`}</span>
                          </a>
                        ) : (
                          <span className="text-[#818f8b]">—</span>
                        )}
                      </td>
                    )}
                    {visibleColumns.orders && (
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                            orderCount > 0
                              ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60'
                          }`}
                        >
                          {orderCount} {t('customers.ordersCount', t('customers.orders', 'orders'))}
                        </span>
                      </td>
                    )}
                    {visibleColumns.spent && (
                      <td className="py-3.5 px-4 font-mono font-bold text-[#16292e] dark:text-[#e7ede9] text-sm sm:text-base whitespace-nowrap">
                        {GlobalFormat.currency(totalSpent)}
                      </td>
                    )}
                    {visibleColumns.createdAt && (
                      <td className="py-3.5 px-4 text-[#71817e] dark:text-slate-400 text-xs font-mono whitespace-nowrap">
                        {c.created_at ? GlobalFormat.date(c.created_at) : '—'}
                      </td>
                    )}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <CustomerRowActions
                        customer={c}
                        isOpen={openDropdownId === c.id}
                        onToggle={() => onDropdownToggle(c.id)}
                        onView={onView}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Standardized SmartHR Pagination Footer */}
      {!loading && totalEntries > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalEntries}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          itemLabel={t('customers.customers', 'customers')}
        />
      )}
    </div>
  );
};

export default CustomerTable;
