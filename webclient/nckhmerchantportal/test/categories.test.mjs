import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

test('Category Table - Category icon/emoji box is removed from table rows', () => {
  const tableFile = fs.readFileSync(path.join(srcDir, 'features/categories/CategoryTable.tsx'), 'utf-8');

  // Verify that the icon container with emoji has been removed from the category cell
  assert.ok(
    !tableFile.includes('{emoji ||'),
    'CategoryTable should not render emoji thumbnail container in rows'
  );
  assert.ok(
    !tableFile.includes('size-9.5 rounded-xl bg-[#ea580c]'),
    'CategoryTable should not have the emoji icon box container'
  );
  // Verify clean category name is still rendered
  assert.ok(
    tableFile.includes('{cleanDisplayName}'),
    'CategoryTable should render cleanDisplayName directly'
  );
});

test('Category Actions - Does not use ... menu and provides direct clean action buttons with red delete', () => {
  const actionsFile = fs.readFileSync(path.join(srcDir, 'features/categories/CategoryActions.tsx'), 'utf-8');

  // Verify MoreHorizontal is removed
  assert.ok(
    !actionsFile.includes('MoreHorizontal'),
    'CategoryRowActions should not import or use MoreHorizontal'
  );
  assert.ok(
    !actionsFile.includes('More Options'),
    'CategoryRowActions should not render More Options dropdown'
  );

  // Verify direct Edit2 and Trash2 buttons are present
  assert.ok(
    actionsFile.includes('Edit2'),
    'CategoryRowActions must provide direct Edit button'
  );
  assert.ok(
    actionsFile.includes('Trash2'),
    'CategoryRowActions must provide direct Delete button'
  );

  // Verify action delete uses red color
  assert.ok(
    actionsFile.includes('text-rose-500') && actionsFile.includes('border-rose-200'),
    'Delete button must use red styling (text-rose-500, border-rose-200, bg-rose-50)'
  );
});

test('Category Delete Popup - CategoryDeleteDialog is exported and used instead of window.confirm', () => {
  const actionsFile = fs.readFileSync(path.join(srcDir, 'features/categories/CategoryActions.tsx'), 'utf-8');
  const pageFile = fs.readFileSync(path.join(srcDir, 'features/categories/CategoriesPage.tsx'), 'utf-8');

  // Verify CategoryDeleteDialog export
  assert.ok(
    actionsFile.includes('export const CategoryDeleteDialog'),
    'CategoryActions must export CategoryDeleteDialog'
  );

  // Verify window.confirm is replaced in CategoriesPage
  assert.ok(
    !pageFile.includes('window.confirm'),
    'CategoriesPage must not use window.confirm'
  );

  // Verify CategoriesPage calls CategoryDeleteDialog
  assert.ok(
    pageFile.includes('<CategoryDeleteDialog'),
    'CategoriesPage must render <CategoryDeleteDialog />'
  );
  assert.ok(
    pageFile.includes('setCategoryToDelete'),
    'CategoriesPage must manage categoryToDelete state to open delete popup'
  );
});

test('Category i18n - Delete dialog keys exist in both English and Khmer', () => {
  const en = JSON.parse(fs.readFileSync(path.join(srcDir, 'locales/en/categories.json'), 'utf-8'));
  const kh = JSON.parse(fs.readFileSync(path.join(srcDir, 'locales/kh/categories.json'), 'utf-8'));

  const keys = ['confirmDeleteTitle', 'confirmDeleteSubtitle', 'confirmDeletePrompt', 'confirmDeleteWarning'];
  for (const k of keys) {
    assert.ok(en[k], `Missing en category key: ${k}`);
    assert.ok(kh[k], `Missing kh category key: ${k}`);
  }
});
