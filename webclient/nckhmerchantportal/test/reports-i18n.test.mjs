import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

test('Reports i18n - English and Khmer locale files have matching keys and valid non-empty values', () => {
  const enPath = path.join(srcDir, 'locales/en/reports.json');
  const khPath = path.join(srcDir, 'locales/kh/reports.json');

  assert.ok(fs.existsSync(enPath), 'en/reports.json must exist');
  assert.ok(fs.existsSync(khPath), 'kh/reports.json must exist');

  const en = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
  const kh = JSON.parse(fs.readFileSync(khPath, 'utf-8'));

  const enKeys = Object.keys(en);
  const khKeys = Object.keys(kh);

  // Check key symmetry
  const missingInKh = enKeys.filter((k) => !(k in kh));
  const missingInEn = khKeys.filter((k) => !(k in en));

  assert.deepEqual(missingInKh, [], `Missing keys in kh/reports.json: ${missingInKh.join(', ')}`);
  assert.deepEqual(missingInEn, [], `Missing keys in en/reports.json: ${missingInEn.join(', ')}`);

  // Check critical keys exist and have non-empty content
  const criticalKeys = [
    'title',
    'totalRevenue',
    'totalOrders',
    'grossProfit',
    'businessSummary',
    'vs',
    'fulfillmentRate',
    'stockUtilization',
    'returnRefundRate',
    'revenueDistribution',
    'revenueDistributionSub',
    'businessOrderTrend',
    'quarterly',
    'yearly',
    'comparePrevious',
    'grossSales',
    'completedOrders',
    'voidCancelled',
    'refundPct',
    'vsLastMonth',
    'allCategories',
    'foodBeverages',
    'allChannels',
    'allPaymentTypes',
    'saveView',
    'viewSaved',
    'viewReset',
    'live',
    'recordsCount',
    'tierDiamond',
    'tierGold',
    'tierSilver',
    'tierRegular',
  ];

  for (const key of criticalKeys) {
    assert.ok(en[key] && en[key].trim().length > 0, `en/reports.json must have non-empty "${key}"`);
    assert.ok(kh[key] && kh[key].trim().length > 0, `kh/reports.json must have non-empty "${key}"`);
  }
});

test('ReportHeaderControls - All static text and filter options are localized', () => {
  const code = fs.readFileSync(path.join(srcDir, 'features/reports/ReportHeaderControls.tsx'), 'utf-8');

  // Verify all dropdown options use t('reports...')
  assert.ok(code.includes("t('reports.vsLastMonth'"), 'Must localize vs Last Month');
  assert.ok(code.includes("t('reports.allCategories'"), 'Must localize All Categories');
  assert.ok(code.includes("t('reports.foodBeverages'"), 'Must localize Food & Beverages');
  assert.ok(code.includes("t('reports.allChannels'"), 'Must localize All Channels');
  assert.ok(code.includes("t('reports.allPaymentTypes'"), 'Must localize All Payment Types');
  assert.ok(code.includes("t('reports.live'"), 'Must localize Live status');
  assert.ok(code.includes("t('reports.recordsCount'"), 'Must localize Record count');

  // Verify Khmer month rendering
  assert.ok(code.includes('khMonths'), 'Must provide authentic Khmer month formatting');
});

test('ReportKPICards - All 5 KPI metrics and comparison headers are localized', () => {
  const code = fs.readFileSync(path.join(srcDir, 'features/reports/ReportKPICards.tsx'), 'utf-8');

  assert.ok(code.includes("t('reports.businessSummary'"), 'Must localize business summary header');
  assert.ok(code.includes("t('reports.vs'"), 'Must localize vs comparison string');
  assert.ok(code.includes("t('reports.totalRevenue'"), 'Must localize total revenue');
  assert.ok(code.includes("t('reports.totalOrders'"), 'Must localize total orders');
  assert.ok(code.includes("t('reports.fulfillmentRate'"), 'Must localize fulfillment rate');
  assert.ok(code.includes("t('reports.stockUtilization'"), 'Must localize stock utilization');
  assert.ok(code.includes("t('reports.returnRefundRate'"), 'Must localize return / refund rate');
});

test('ReportChartsSection - Dynamic live calculations and localized tabs', () => {
  const code = fs.readFileSync(path.join(srcDir, 'features/reports/ReportChartsSection.tsx'), 'utf-8');

  // Verify live computations instead of static fake numbers
  assert.ok(code.includes('distributionItems'), 'Must dynamically calculate distribution items');
  assert.ok(code.includes("distTab === 'channel'"), 'Must dynamically calculate channel distribution');
  assert.ok(code.includes('completedOrdersCount'), 'Must dynamically count completed orders');
  assert.ok(code.includes('refundRate'), 'Must dynamically calculate refund rate');

  // Verify translations
  assert.ok(code.includes("t('reports.revenueDistribution'"), 'Must localize Revenue Distribution');
  assert.ok(code.includes("t('reports.businessOrderTrend'"), 'Must localize Business Order Trend');
  assert.ok(code.includes("t('reports.grossSales'"), 'Must localize Gross Sales');
  assert.ok(code.includes("t('reports.completedOrders'"), 'Must localize Completed Orders');
  assert.ok(code.includes("t('reports.voidCancelled'"), 'Must localize Void/Cancelled');
  assert.ok(code.includes("t('reports.comparePrevious'"), 'Must localize Compare previous');
});

test('CustomerReportTable - Membership tiers are localized', () => {
  const code = fs.readFileSync(path.join(srcDir, 'features/reports/CustomerReportTable.tsx'), 'utf-8');

  assert.ok(code.includes("t('reports.tierDiamond'"), 'Diamond tier must be localized');
  assert.ok(code.includes("t('reports.tierGold'"), 'Gold tier must be localized');
  assert.ok(code.includes("t('reports.tierSilver'"), 'Silver tier must be localized');
  assert.ok(code.includes("t('reports.tierRegular'"), 'Regular tier must be localized');
});

test('StockHealthTable - Correct navigation link to /stock and localized badges', () => {
  const code = fs.readFileSync(path.join(srcDir, 'features/reports/StockHealthTable.tsx'), 'utf-8');

  assert.ok(code.includes('to="/stock"'), 'Manage button must navigate to /stock instead of broken /products/stock');
  assert.ok(!code.includes('to="/products/stock"'), 'Must not have broken /products/stock link');
  assert.ok(code.includes("t('reports.healthyStock'"), 'Must localize Healthy Stock');
  assert.ok(code.includes("t('reports.outOfStock'"), 'Must localize Out of Stock');
  assert.ok(code.includes("t('reports.lowStock'"), 'Must localize Low Stock');
});

test('Reports Reset & Clean Filter Bar - Full operational handlers and reset logic', () => {
  const pageCode = fs.readFileSync(path.join(srcDir, 'features/reports/ReportsPage.tsx'), 'utf-8');
  const controlsCode = fs.readFileSync(path.join(srcDir, 'features/reports/ReportHeaderControls.tsx'), 'utf-8');

  // Verify Save View is removed for clean UI
  assert.ok(!controlsCode.includes('BookmarkCheck'), 'Save view button must be removed from ReportHeaderControls');
  assert.ok(!controlsCode.includes('handleToggleSaveView'), 'Unused handleToggleSaveView must be removed');

  // Verify Reset functionality
  assert.ok(pageCode.includes('handleResetFilters'), 'ReportsPage must have handleResetFilters handler');
  assert.ok(pageCode.includes('setDays(30)'), 'Reset must reset days back to 30');
  assert.ok(pageCode.includes("setPeriod('daily')"), 'Reset must reset period back to daily');
  assert.ok(pageCode.includes("setSelectedCategory('all')"), 'Reset must reset category to all');
  assert.ok(pageCode.includes("setSelectedChannel('all')"), 'Reset must reset channel to all');
  assert.ok(pageCode.includes("setSelectedPayment('all')"), 'Reset must reset payment to all');

  // Verify Reactive Data Filtering & Silent Apply
  assert.ok(pageCode.includes('hasActiveFilters'), 'ReportsPage must track hasActiveFilters');
  assert.ok(pageCode.includes('handleApplyFilters'), 'ReportsPage must have handleApplyFilters handler');
});

test('Telegram Report Dispatch & Safe Share - Fixed Nginx 400 & Bot Response Handling', () => {
  const modalCode = fs.readFileSync(path.join(srcDir, 'features/reports/TelegramReportModal.tsx'), 'utf-8');
  const pageCode = fs.readFileSync(path.join(srcDir, 'features/reports/ReportsPage.tsx'), 'utf-8');
  const en = JSON.parse(fs.readFileSync(path.join(srcDir, 'locales/en/reports.json'), 'utf-8'));
  const kh = JSON.parse(fs.readFileSync(path.join(srcDir, 'locales/kh/reports.json'), 'utf-8'));

  // 1. Verify i18n keys for modal
  assert.ok(en.telegramCardPreview && kh.telegramCardPreview, 'telegramCardPreview must exist in both');
  assert.ok(en.rawFormat && kh.rawFormat, 'rawFormat must exist in both');
  assert.ok(en.fullReportCopiedNotice && kh.fullReportCopiedNotice, 'fullReportCopiedNotice must exist in both');

  // 2. Verify modal uses localized title & labels
  assert.ok(modalCode.includes("t('reports.telegramModalTitle'"), 'Modal title must be localized');
  assert.ok(modalCode.includes("t('reports.telegramModalSubtitle'"), 'Modal subtitle must be localized');
  assert.ok(modalCode.includes("t('reports.telegramCardPreview'"), 'Card preview label must be localized');
  assert.ok(modalCode.includes("t('reports.rawFormat'"), 'Raw format label must be localized');

  // 3. Verify response unwrapping check in handleSendViaBot (handles Axios res.ok / res.data / res.status)
  assert.ok(modalCode.includes('res?.ok === true || res?.success === true'), 'Bot handler must check unwrapped res.ok');

  // 4. Verify safe telegram share link prevents 400 Bad Request
  assert.ok(pageCode.includes('decodeEntities'), 'ReportsPage must decode HTML entities');
  assert.ok(pageCode.includes('safeShortText'), 'ReportsPage must construct safe short text for URL');
  assert.ok(pageCode.includes('url=${encodeURIComponent(window.location.origin)}'), 'Share URL must include safe origin url');
  assert.ok(pageCode.includes('navigator.clipboard.writeText(cleanFullReport)'), 'Full report must be copied to clipboard');
});

test('Report Print Document & Isolated Print Engine - Crisp A4 Business Format', () => {
  const printUtilCode = fs.readFileSync(path.join(srcDir, 'utils/printReport.ts'), 'utf-8');
  const docCode = fs.readFileSync(path.join(srcDir, 'features/reports/ReportPrintDocument.tsx'), 'utf-8');
  const pageCode = fs.readFileSync(path.join(srcDir, 'features/reports/ReportsPage.tsx'), 'utf-8');
  const cssCode = fs.readFileSync(path.join(srcDir, 'styles/globals.css'), 'utf-8');

  // 1. Verify isolated print utility
  assert.ok(printUtilCode.includes('report-hidden-print-frame'), 'Must use isolated hidden iframe');
  assert.ok(printUtilCode.includes('A4 portrait'), 'Must configure A4 portrait layout');
  assert.ok(printUtilCode.includes('Kantumruy Pro'), 'Must load Kantumruy Pro font for clean Khmer typography');

  // 2. Verify ReportPrintDocument sections
  assert.ok(docCode.includes('ReportPrintDocument'), 'Must export ReportPrintDocument component');
  assert.ok(docCode.includes('revenueKhrStr'), 'Must support dual currency ($ and ៛)');
  assert.ok(docCode.includes('paymentBreakdown'), 'Must display payment method breakdown');
  assert.ok(docCode.includes('topProducts'), 'Must display top selling products');
  assert.ok(docCode.includes('Prepared By'), 'Must have official signature lines');

  // 3. Verify ReportsPage integration
  assert.ok(pageCode.includes('printReportHtml(html'), 'handlePrint must invoke printReportHtml');
  assert.ok(pageCode.includes('printRenderRef'), 'ReportsPage must manage print staging ref');
  assert.ok(pageCode.includes('<ReportPrintDocument'), 'ReportsPage must mount ReportPrintDocument');

  // 4. Verify global @media print CSS rules
  assert.ok(cssCode.includes('@media print'), 'globals.css must have dedicated @media print rules');
  assert.ok(cssCode.includes('display: none !important'), 'Screen chrome must be hidden on print');
});


