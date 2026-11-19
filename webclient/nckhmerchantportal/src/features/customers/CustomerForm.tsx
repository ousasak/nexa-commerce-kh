import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { Customer, CustomerFormData } from './customer.types';
import { useLanguage } from '../../i18n';

interface CustomerFormProps {
  isOpen: boolean;
  isSaving: boolean;
  editingCustomer: Customer | null;
  formData: CustomerFormData;
  setFormData: React.Dispatch<React.SetStateAction<CustomerFormData>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  isOpen,
  isSaving,
  editingCustomer,
  formData,
  setFormData,
  onClose,
  onSubmit,
}) => {
  const { t } = useLanguage();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <form onSubmit={onSubmit}>
          <DialogHeader className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800/60">
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              {editingCustomer
                ? t('customers.editCustomer', 'Edit Customer')
                : t('customers.addNewCustomer', 'Add New Customer')}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editingCustomer
                ? t('customers.editDesc', 'Update contact and shipping details for this customer')
                : t('customers.newDesc', 'Register a new customer for orders, delivery, and loyalty')}
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-3.5 max-h-[70vh] overflow-y-auto">
            {/* Name & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('customers.fullName', 'Full Name')} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={t('customers.fullNamePlaceholder', 'e.g. Sokha Chan')}
                  required
                  className="h-9 text-xs bg-slate-50 dark:bg-slate-800/50"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('customers.phone', 'Phone Number')} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder={t('customers.phonePlaceholder', '012 345 678')}
                  required
                  className="h-9 text-xs bg-slate-50 dark:bg-slate-800/50"
                />
              </div>
            </div>

            {/* Telegram & Email */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('customers.telegramUsername', 'Telegram Username')}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400">@</span>
                  <Input
                    value={formData.telegram}
                    onChange={(e) => setFormData((prev) => ({ ...prev, telegram: e.target.value }))}
                    placeholder={t('customers.telegramPlaceholder', 'username')}
                    className="h-9 pl-7 text-xs bg-slate-50 dark:bg-slate-800/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('customers.emailAddress', 'Email Address')}
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder={t('customers.emailPlaceholder', 'customer@example.com')}
                  className="h-9 text-xs bg-slate-50 dark:bg-slate-800/50"
                />
              </div>
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('customers.city', 'City / Province')}
              </Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                placeholder={t('customers.cityPlaceholder', 'e.g. Phnom Penh, Siem Reap, Battambang')}
                className="h-9 text-xs bg-slate-50 dark:bg-slate-800/50"
              />
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('customers.streetAddress', 'Street Address')}
              </Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                placeholder={t('customers.addressPlaceholder', 'House No, Street, Sangkat, Khan')}
                className="h-9 text-xs bg-slate-50 dark:bg-slate-800/50"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('customers.notes', 'Internal Notes')}
              </Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder={t('customers.notesPlaceholder', 'Special delivery notes, VIP customer tag, or preferences...')}
                rows={2}
                className="text-xs bg-slate-50 dark:bg-slate-800/50 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSaving}
              className="text-xs"
            >
              {t('customers.cancel', t('common.cancel', 'Cancel'))}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              style={{
                backgroundColor: 'var(--btn-primary-hex, var(--primary-hex, #ec4899))',
              }}
              className="hover:brightness-90 text-white text-xs gap-1.5"
            >
              {isSaving && <Loader2 className="size-3 animate-spin" />}
              <span>{editingCustomer ? t('customers.saveChangesButton', t('common.save', 'Save Changes')) : t('customers.addCustomer', t('common.create', 'Add Customer'))}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerForm;
