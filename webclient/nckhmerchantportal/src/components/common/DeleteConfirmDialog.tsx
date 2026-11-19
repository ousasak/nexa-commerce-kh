import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLanguage } from '../../i18n';

export interface DeleteConfirmDialogProps {
  open: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  itemName?: string;
  isDeleting?: boolean;
  cancelLabel?: string;
  deleteLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
  children?: React.ReactNode;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  title,
  description,
  itemName,
  isDeleting = false,
  cancelLabel,
  deleteLabel,
  onClose,
  onConfirm,
  children,
}) => {
  const { t } = useLanguage();

  const defaultTitle = t('common.confirmDeleteTitle', 'Delete Item?');
  const defaultDesc = itemName
    ? t(
        'common.confirmDeleteNamedDesc',
        `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
        { name: itemName }
      )
    : t(
        'common.confirmDeleteGenericDesc',
        'Are you sure you want to delete this item? This action cannot be undone.'
      );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader className="p-5 pb-3">
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
            {title || defaultTitle}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-1 leading-relaxed">
            {description || defaultDesc}
          </DialogDescription>
        </DialogHeader>

        {children && <div className="px-5 pb-3 text-xs">{children}</div>}

        <DialogFooter className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
            className="text-xs"
          >
            {cancelLabel || t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5"
          >
            {isDeleting && <Loader2 className="size-3 animate-spin" />}
            <span>{deleteLabel || t('common.delete', 'Delete')}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmDialog;

