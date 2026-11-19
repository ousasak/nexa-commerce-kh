import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const enPath = path.resolve(__dirname, '../src/locales/en/telegram.json');
const khPath = path.resolve(__dirname, '../src/locales/kh/telegram.json');

test('Telegram i18n - English and Khmer json files exist and are valid JSON', () => {
  assert.ok(fs.existsSync(enPath), 'en/telegram.json must exist');
  assert.ok(fs.existsSync(khPath), 'kh/telegram.json must exist');

  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const khData = JSON.parse(fs.readFileSync(khPath, 'utf8'));

  assert.equal(typeof enData, 'object');
  assert.equal(typeof khData, 'object');
});

test('Telegram i18n - Live Simulation text correctly defined in Khmer', () => {
  const khData = JSON.parse(fs.readFileSync(khPath, 'utf8'));
  assert.equal(khData.liveSimulation, 'ការបង្ហាញគំរូជាក់ស្តែង');
  assert.ok(khData.previewTitle, 'previewTitle must be defined in Khmer');
});

test('Telegram i18n - Key symmetry between English and Khmer translations', () => {
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const khData = JSON.parse(fs.readFileSync(khPath, 'utf8'));

  const enKeys = Object.keys(enData);
  const khKeys = Object.keys(khData);

  assert.equal(enKeys.length, khKeys.length, `Key counts must match (${enKeys.length} vs ${khKeys.length})`);

  for (const key of enKeys) {
    assert.ok(key in khData, `Key "${key}" must exist in kh/telegram.json`);
    assert.ok(khData[key] && khData[key].trim().length > 0, `Key "${key}" in kh/telegram.json must not be empty`);
  }
});

test('Telegram i18n - Crucial function keys are present in both locales', () => {
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const khData = JSON.parse(fs.readFileSync(khPath, 'utf8'));

  const requiredKeys = [
    'title',
    'subtitle',
    'saveSettings',
    'saveSuccess',
    'saveFailed',
    'card1Title',
    'card2Title',
    'botTokenLabel',
    'chatIdLabel',
    'sendTestBtn',
    'testSuccess',
    'testFailed',
    'sendStockAlertBtn',
    'stockAlertSuccess',
    'registerWebhookBtn',
    'webhookSuccess',
    'linkedChatsTitle',
    'unlinkChat',
    'unlinkSuccess',
    'liveSimulation',
    'previewTitle',
    'botOnline',
    'botBadge',
    'orderMockTitle',
    'orderMockNumber',
    'orderMockCustomer',
    'orderMockAmount',
    'orderMockPayment',
    'orderMockStatus',
    'orderMockTime',
    'botFatherHelpTitle',
    'openBotFather',
  ];

  for (const k of requiredKeys) {
    assert.ok(enData[k], `en/telegram.json must have "${k}"`);
    assert.ok(khData[k], `kh/telegram.json must have "${k}"`);
  }
});

test('TelegramService - Service module exports all expected API methods', async () => {
  const serviceFile = fs.readFileSync(path.resolve(__dirname, '../src/services/telegramService.ts'), 'utf8');
  assert.ok(serviceFile.includes('test:'), 'must have test method');
  assert.ok(serviceFile.includes('getSettings:'), 'must have getSettings method');
  assert.ok(serviceFile.includes('setWebhook:'), 'must have setWebhook method');
  assert.ok(serviceFile.includes('unlinkChat:'), 'must have unlinkChat method');
  assert.ok(serviceFile.includes('sendStockAlert:'), 'must have sendStockAlert method');
});

