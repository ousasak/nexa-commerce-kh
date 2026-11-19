import React from 'react';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { Category } from './category.types';
import { useLanguage } from '../../i18n';
import { localizeCategoryName } from './categoryUtils';
import { DeleteConfirmDialog } from '../../components/common/DeleteConfirmDialog';

interface CategoryRowActionsProps {
  category: Category;
  isOpen?: boolean;
  onToggle?: () => void;
  onEdit: (category: Category) => void;
  onDelete: (id: number, name: string) => void;
}

export const CategoryRowActions: React.FC<CategoryRowActionsProps> = ({
  category,
  onEdit,
  onDelete,
}) => {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-end gap-1.5">
      {/* Edit Button */}
      <button
        type="button"
        onClick={() => onEdit(category)}
        title={t('categories.edit', t('buttons.edit', 'Edit'))}
        className="size-8.5 sm:size-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all cursor-pointer shadow-2xs active:scale-95"
      >
        <Edit2 className="size-4" />
      </button>

      {/* Delete Button (Action delete in red) */}
      <button
        type="button"
        onClick={() => onDelete(category.id, category.name)}
        title={t('categories.delete', t('buttons.delete', 'Delete'))}
        className="size-8.5 sm:size-9 rounded-xl flex items-center justify-center text-rose-500 hover:text-white border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-600 dark:hover:bg-rose-600 transition-all cursor-pointer shadow-2xs active:scale-95"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
};

export interface CategoryDeleteDialogProps {
  category: Category | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const CategoryDeleteDialog: React.FC<CategoryDeleteDialogProps> = ({
  category,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  const { t, language } = useLanguage();
  const isKhmer = language === 'kh';

  const categoryName = category ? localizeCategoryName(category.name, isKhmer, false) : '';

  return (
    <DeleteConfirmDialog
      open={Boolean(category)}
      title={t('categories.confirmDeleteTitle', 'Delete Category?')}
      description={
        categoryName
          ? t(
              'categories.confirmDeleteNamedDesc',
              `Are you sure you want to delete category "${categoryName}"? This action cannot be undone.`,
              { name: categoryName }
            )
          : t(
              'categories.confirmDeleteDesc',
              'Are you sure you want to delete this category? This action cannot be undone.'
            )
      }
      isDeleting={isDeleting}
      cancelLabel={t('common.cancel', 'Cancel')}
      deleteLabel={t('categories.delete', t('common.delete', 'Delete'))}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
};

interface CategoryHeaderActionsProps {
  onAddCategory: () => void;
}

export const CategoryHeaderActions: React.FC<CategoryHeaderActionsProps> = ({
  onAddCategory,
}) => {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={onAddCategory}
      style={{
        backgroundColor: 'var(--btn-primary-hex, var(--primary-hex, #ec4899))',
      }}
      className="h-10 sm:h-10.5 px-4.5 rounded-xl hover:brightness-90 text-white text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow active:scale-[0.98]"
    >
      <Plus className="size-4 stroke-[2.5]" />
      <span>{t('categories.addCategory', t('restaurant.addCategory', 'Add Category'))}</span>
    </button>
  );
};

export default CategoryRowActions;
