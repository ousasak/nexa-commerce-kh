import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const enPath = path.resolve(__dirname, '../src/locales/en/stock.json');
const khPath = path.resolve(__dirname, '../src/locales/kh/stock.json');
const i18nPath = path.resolve(__dirname, '../src/i18n/i18n.ts');
const stockPagePath = path.resolve(__dirname, '../src/features/inventory/StockPage.tsx');

test('Stock i18n - English and Khmer json files exist and are valid JSON', () => {
  assert.ok(fs.existsSync(enPath), 'en/stock.json must exist');
  assert.ok(fs.existsSync(khPath), 'kh/stock.json must exist');

  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const khData = JSON.parse(fs.readFileSync(khPath, 'utf8'));

  assert.equal(typeof enData, 'object');
  assert.equal(typeof khData, 'object');
});

test('Stock i18n - Key symmetry between English and Khmer translations', () => {
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const khData = JSON.parse(fs.readFileSync(khPath, 'utf8'));

  const enKeys = Object.keys(enData);
  const khKeys = Object.keys(khData);

  assert.equal(enKeys.length, khKeys.length, `Key counts must match (${enKeys.length} vs ${khKeys.length})`);

  for (const key of enKeys) {
    assert.ok(key in khData, `Key "${key}" must exist in kh/stock.json`);
    assert.ok(khData[key] && khData[key].trim().length > 0, `Key "${key}" in kh/stock.json must not be empty`);
  }
});

test('Stock i18n - Proper accurate Khmer terminology for stock statuses', () => {
  const khData = JSON.parse(fs.readFileSync(khPath, 'utf8'));

  assert.equal(khData.outOfStock, 'អស់ពីស្តុក', 'outOfStock must be အស់ពីស្តុក (not ចំនួនខ្វះ)');
  assert.equal(khData.lowStock, 'ស្តុកតិច', 'lowStock must be ស្តុកតិច (not ក្នុងគំនូរ)');
  assert.equal(khData.inStock, 'មានគ្រប់គ្រាន់', 'inStock must be មានគ្រប់គ្រាន់');
  assert.equal(khData.highStock, 'ស្តុកច្រើន', 'highStock must be ស្តុកច្រើន (not ស្ទុករួច)');
});

test('Stock i18n - All static text keys for Stock feature exist in both locales', () => {
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const khData = JSON.parse(fs.readFileSync(khPath, 'utf8'));

  const requiredKeys = [
    'title',
    'subtitle',
    'lowThreshold',
    'highThreshold',
    'apply',
    'reset',
    'telegramAlert',
    'sending',
    'alertSent',
    'alertFailed',
    'outOfStock',
    'lowStock',
    'inStock',
    'highStock',
    'all',
    'searchPlaceholder',
    'product',
    'category',
    'currentStock',
    'status',
    'actions',
    'moreOptions',
    'addStock',
    'setStock',
    'editProduct',
    'noMatchTitle',
    'emptyCategory',
    'items',
    'addStockTitle',
    'setStockTitle',
    'currentStockLabel',
    'qtyToAdd',
    'newQty',
    'resultingStock',
    'cancel',
    'save',
    'updateSuccess',
    'updateFailed',
    'loadFailed',
    'id',
  ];

  for (const k of requiredKeys) {
    assert.ok(enData[k], `en/stock.json must have "${k}"`);
    assert.ok(khData[k], `kh/stock.json must have "${k}"`);
  }
});

test('Stock Page - Registered in i18n.ts and clean action button used', () => {
  const i18nContent = fs.readFileSync(i18nPath, 'utf8');
  assert.ok(i18nContent.includes('enStock'), 'i18n.ts must import enStock');
  assert.ok(i18nContent.includes('khStock'), 'i18n.ts must import khStock');
  assert.ok(i18nContent.includes("stock: enStock"), 'i18n.ts must register stock namespace in en');
  assert.ok(i18nContent.includes("stock: khStock"), 'i18n.ts must register stock namespace in kh');

  const stockPageContent = fs.readFileSync(stockPagePath, 'utf8');
  // Check that size-8.5 is gone
  assert.ok(!stockPageContent.includes('size-8.5'), 'size-8.5 must be replaced with size-10');
  // Check that MoreHorizontal with size-4.5 and size-9 button is used
  assert.ok(stockPageContent.includes('size-9 rounded-xl'), 'Action button must use size-9 rounded-xl');
  assert.ok(stockPageContent.includes('MoreHorizontal'), 'Action button must use MoreHorizontal');
  // Check that hardcoded Khmer status labels in GROUP_META are gone
  assert.ok(!stockPageContent.includes("'ចំនួនខ្វះ'"), "hardcoded 'ចំនួនខ្វះ' must be removed");
  assert.ok(!stockPageContent.includes("'ក្នុងគំនូរ'"), "hardcoded 'ក្នុងគំនូរ' must be removed");
  assert.ok(!stockPageContent.includes("'ស្ទុករួច'"), "hardcoded 'ស្ទុករួច' must be removed");
});

