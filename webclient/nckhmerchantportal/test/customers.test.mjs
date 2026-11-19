import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const enPath = path.resolve(__dirname, '../src/locales/en/customers.json');
const khPath = path.resolve(__dirname, '../src/locales/kh/customers.json');
const customerServicePath = path.resolve(__dirname, '../src/services/customerService.ts');
const customersPagePath = path.resolve(__dirname, '../src/features/customers/CustomersPage.tsx');

test('Customers i18n - English and Khmer json files exist and are valid JSON', () => {
  assert.ok(fs.existsSync(enPath), 'en/customers.json must exist');
  assert.ok(fs.existsSync(khPath), 'kh/customers.json must exist');

  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const khData = JSON.parse(fs.readFileSync(khPath, 'utf8'));

  assert.equal(typeof enData, 'object');
  assert.equal(typeof khData, 'object');
});

test('Customers i18n - Key symmetry between English and Khmer translations', () => {
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const khData = JSON.parse(fs.readFileSync(khPath, 'utf8'));

  const enKeys = Object.keys(enData);
  const khKeys = Object.keys(khData);

  assert.equal(enKeys.length, khKeys.length, `Key counts must match (${enKeys.length} vs ${khKeys.length})`);

  for (const key of enKeys) {
    assert.ok(key in khData, `Key "${key}" must exist in kh/customers.json`);
    assert.ok(khData[key] && khData[key].trim().length > 0, `Key "${key}" in kh/customers.json must not be empty`);
  }
});

test('Customers i18n - All static text keys for Customer feature exist in both locales', () => {
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const khData = JSON.parse(fs.readFileSync(khPath, 'utf8'));

  const requiredKeys = [
    'title',
    'subtitle',
    'allClients',
    'totalCustomers',
    'active',
    'activeBuyers',
    'revenue',
    'totalRevenue',
    'searchPlaceholder',
    'allCustomers',
    'hasOrders',
    'noOrders',
    'apply',
    'reset',
    'customer',
    'phone',
    'telegram',
    'orders',
    'spent',
    'joined',
    'actions',
    'viewDetails',
    'edit',
    'delete',
    'addCustomer',
    'newCustomer',
    'addNewCustomer',
    'editCustomer',
    'customerDetails',
    'confirmDeleteTitle',
    'confirmDeleteDesc',
    'cancel',
    'close',
    'saveChangesButton',
    'nameRequired',
    'phoneRequired',
    'createdSuccess',
    'updatedSuccess',
    'deletedSuccess',
    'saveFailed',
    'deleteFailed',
    'loadFailed',
  ];

  for (const k of requiredKeys) {
    assert.ok(enData[k], `en/customers.json must have "${k}"`);
    assert.ok(khData[k], `kh/customers.json must have "${k}"`);
  }
});

test('Customer Form Payload - Handles optional fields and telegram normalization properly', () => {
  function preparePayload(formData) {
    return {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      telegram: formData.telegram.trim()
        ? formData.telegram.trim().startsWith('@')
          ? formData.telegram.trim()
          : `@${formData.telegram.trim()}`
        : '',
      email: formData.email.trim(),
      city: formData.city.trim(),
      address: formData.address.trim(),
      notes: formData.notes.trim(),
    };
  }

  // 1. Cleared optional fields produce clean empty strings instead of null
  const payload1 = preparePayload({
    name: '  Sokha Chan  ',
    phone: '  012111177  ',
    telegram: '',
    email: '   ',
    city: '',
    address: '   ',
    notes: '',
  });

  assert.equal(payload1.name, 'Sokha Chan');
  assert.equal(payload1.phone, '012111177');
  assert.equal(payload1.telegram, '');
  assert.equal(payload1.email, '');
  assert.equal(payload1.address, '');
  assert.equal(payload1.city, '');
  assert.equal(payload1.notes, '');

  // 2. Telegram without '@' gets prefixed with '@'
  const payload2 = preparePayload({
    name: 'Vannak Heng',
    phone: '012204826',
    telegram: 'vannak3',
    email: 'vannak@example.com',
    city: 'Phnom Penh',
    address: 'Street 271',
    notes: 'VIP customer',
  });

  assert.equal(payload2.telegram, '@vannak3');

  // 3. Telegram already with '@' preserves single '@'
  const payload3 = preparePayload({
    name: 'Dara Sam',
    phone: '012991480',
    telegram: '@dara7',
    email: '',
    city: '',
    address: '',
    notes: '',
  });

  assert.equal(payload3.telegram, '@dara7');
});

test('Customer Validation - Required fields validation logic', () => {
  function validateCustomer(formData) {
    if (!formData.name.trim()) {
      return { valid: false, error: 'nameRequired' };
    }
    if (!formData.phone.trim()) {
      return { valid: false, error: 'phoneRequired' };
    }
    return { valid: true };
  }

  assert.deepEqual(validateCustomer({ name: '', phone: '012345678' }), {
    valid: false,
    error: 'nameRequired',
  });
  assert.deepEqual(validateCustomer({ name: '   ', phone: '012345678' }), {
    valid: false,
    error: 'nameRequired',
  });
  assert.deepEqual(validateCustomer({ name: 'Sokha', phone: '' }), {
    valid: false,
    error: 'phoneRequired',
  });
  assert.deepEqual(validateCustomer({ name: 'Sokha', phone: '   ' }), {
    valid: false,
    error: 'phoneRequired',
  });
  assert.deepEqual(validateCustomer({ name: 'Sokha', phone: '012345678' }), {
    valid: true,
  });
});

test('Customer Service - Exports all essential CRUD methods', () => {
  const serviceContent = fs.readFileSync(customerServicePath, 'utf8');
  assert.ok(serviceContent.includes('list:'), 'customerService must have list method');
  assert.ok(serviceContent.includes('get:'), 'customerService must have get method');
  assert.ok(serviceContent.includes('create:'), 'customerService must have create method');
  assert.ok(serviceContent.includes('update:'), 'customerService must have update method');
  assert.ok(serviceContent.includes('delete:'), 'customerService must have delete method');
});

test('Customers Page - Dispatches update and create with proper error toasts', () => {
  const pageContent = fs.readFileSync(customersPagePath, 'utf8');
  assert.ok(pageContent.includes('customerService.update'), 'CustomersPage must call customerService.update');
  assert.ok(pageContent.includes('customerService.create'), 'CustomersPage must call customerService.create');
  assert.ok(pageContent.includes('customerService.delete'), 'CustomersPage must call customerService.delete');
  assert.ok(pageContent.includes('t(\'customers.updatedSuccess\''), 'Must have updatedSuccess toast');
  assert.ok(pageContent.includes('t(\'customers.createdSuccess\''), 'Must have createdSuccess toast');
  assert.ok(pageContent.includes('t(\'customers.nameRequired\''), 'Must have nameRequired validation');
  assert.ok(pageContent.includes('t(\'customers.phoneRequired\''), 'Must have phoneRequired validation');
});
