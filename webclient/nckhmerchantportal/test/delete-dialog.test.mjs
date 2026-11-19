import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

test('Global DeleteConfirmDialog - Component exists and is exported from common', () => {
  const dialogFile = fs.readFileSync(path.join(srcDir, 'components/common/DeleteConfirmDialog.tsx'), 'utf-8');
  const indexFile = fs.readFileSync(path.join(srcDir, 'components/common/index.ts'), 'utf-8');

  assert.ok(
    dialogFile.includes('export const DeleteConfirmDialog'),
    'DeleteConfirmDialog must be exported'
  );
  assert.ok(
    dialogFile.includes('bg-rose-600'),
    'Delete button must use rose-600 background'
  );
  assert.ok(
    indexFile.includes("export * from './DeleteConfirmDialog'"),
    'DeleteConfirmDialog must be exported in common/index.ts'
  );
});

test('Close Button - Compact refined sizing implemented', () => {
  const closeButtonFile = fs.readFileSync(path.join(srcDir, 'components/ui/CloseButton.tsx'), 'utf-8');
  const dialogFile = fs.readFileSync(path.join(srcDir, 'components/ui/dialog.tsx'), 'utf-8');

  assert.ok(
    closeButtonFile.includes('icon: 13'),
    'CloseButton sm size must use icon size 13'
  );
  assert.ok(
    dialogFile.includes('size="sm"'),
    'Dialog must use size="sm" for CloseButton'
  );
  assert.ok(
    dialogFile.includes('!w-7 !h-7'),
    'Dialog must use !w-7 !h-7 for compact close button'
  );
});

test('Global Delete Dialog Integration - Products, Categories, Customers all use dialogs without window.confirm', () => {
  const productsPage = fs.readFileSync(path.join(srcDir, 'features/products/ProductsPage.tsx'), 'utf-8');
  const categoriesPage = fs.readFileSync(path.join(srcDir, 'features/categories/CategoriesPage.tsx'), 'utf-8');
  const customersPage = fs.readFileSync(path.join(srcDir, 'features/customers/CustomersPage.tsx'), 'utf-8');

  // Verify none of them use window.confirm
  assert.ok(
    !productsPage.includes('window.confirm'),
    'ProductsPage must not use window.confirm'
  );
  assert.ok(
    !categoriesPage.includes('window.confirm'),
    'CategoriesPage must not use window.confirm'
  );
  assert.ok(
    !customersPage.includes('window.confirm'),
    'CustomersPage must not use window.confirm'
  );

  // Verify all use Delete confirmation dialogs
  assert.ok(
    productsPage.includes('<DeleteConfirmDialog'),
    'ProductsPage must render <DeleteConfirmDialog />'
  );
  assert.ok(
    categoriesPage.includes('<CategoryDeleteDialog'),
    'CategoriesPage must render <CategoryDeleteDialog />'
  );
  assert.ok(
    customersPage.includes('<CustomerDeleteDialog'),
    'CustomersPage must render <CustomerDeleteDialog />'
  );
});

test('Delete Popup i18n - All static delete message keys are fully translated in EN and KH', () => {
  const loadPair = (name) => ({
    en: JSON.parse(fs.readFileSync(path.join(srcDir, `locales/en/${name}.json`), 'utf-8')),
    kh: JSON.parse(fs.readFileSync(path.join(srcDir, `locales/kh/${name}.json`), 'utf-8')),
  });

  const common = loadPair('common');
  const customers = loadPair('customers');
  const categories = loadPair('categories');
  const products = loadPair('products');

  // Common delete keys
  const commonKeys = ['confirmDeleteTitle', 'confirmDeleteSubtitle', 'confirmDeleteNamedDesc', 'confirmDeleteGenericDesc', 'cancel', 'delete'];
  for (const k of commonKeys) {
    assert.ok(common.en[k], `Missing EN common.${k}`);
    assert.ok(common.kh[k], `Missing KH common.${k}`);
  }

  // Customer delete keys
  const customerKeys = ['confirmDeleteTitle', 'confirmDeleteDesc', 'confirmDeleteNamedDesc'];
  for (const k of customerKeys) {
    assert.ok(customers.en[k], `Missing EN customers.${k}`);
    assert.ok(customers.kh[k], `Missing KH customers.${k}`);
  }

  // Category delete keys
  const categoryKeys = ['confirmDeleteTitle', 'confirmDeleteSubtitle', 'confirmDeleteDesc', 'confirmDeleteNamedDesc'];
  for (const k of categoryKeys) {
    assert.ok(categories.en[k], `Missing EN categories.${k}`);
    assert.ok(categories.kh[k], `Missing KH categories.${k}`);
  }

  // Product delete keys
  const productKeys = ['confirmDeleteTitle', 'confirmDeleteSubtitle', 'confirmDeleteDesc', 'confirmDeleteNamedDesc'];
  for (const k of productKeys) {
    assert.ok(products.en[k], `Missing EN products.${k}`);
    assert.ok(products.kh[k], `Missing KH products.${k}`);
  }
});

