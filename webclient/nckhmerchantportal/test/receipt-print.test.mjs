import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const portalSrc = path.resolve(__dirname, '../src');

describe('Receipt Print Capture & Data Binding', () => {
  it('printReceipt utility exists and sets up isolated hidden iframe', () => {
    const printUtilFile = path.join(portalSrc, 'utils/printReceipt.ts');
    assert.ok(fs.existsSync(printUtilFile), 'utils/printReceipt.ts must exist');

    const content = fs.readFileSync(printUtilFile, 'utf8');
    assert.ok(content.includes('export function printReceiptHtml'), 'Must export printReceiptHtml function');
    assert.ok(content.includes('createElement(\'iframe\')'), 'Must create an isolated iframe');
    assert.ok(content.includes('receipt-hidden-print-frame'), 'Must assign standard iframe id');
    assert.ok(content.includes('node.outerHTML') || content.includes('cloneNode(true)'), 'Must clone parent stylesheets and link tags');
    assert.ok(!content.includes('visibility: hidden !important'), 'Must not hide body * which causes 2 blank pages');
  });

  it('ReceiptPrintDocument calculates dual currencies and defensive fallbacks correctly', () => {
    const docFile = path.join(portalSrc, 'features/orders/ReceiptPrintDocument.tsx');
    assert.ok(fs.existsSync(docFile), 'ReceiptPrintDocument.tsx must exist');

    const content = fs.readFileSync(docFile, 'utf8');
    assert.ok(content.includes('const isOrderKhr'), 'Must check order currency');
    assert.ok(content.includes('computedItemsSum'), 'Must provide defensive items total calculation');
    assert.ok(content.includes('rawItemsTotal'), 'Must fallback to items total when missing or 0');
    assert.ok(content.includes('rawTotal'), 'Must compute total safely');
    assert.ok(content.includes('items.length === 0'), 'Must handle empty items list gracefully');
    assert.ok(content.includes('formatDual'), 'Must support dual currency USD & KHR formatting');
  });

  it('ReceiptPrintDocument contains complete receipt metadata sections', () => {
    const docFile = path.join(portalSrc, 'features/orders/ReceiptPrintDocument.tsx');
    const content = fs.readFileSync(docFile, 'utf8');

    // Section 1: Header / Store identity
    assert.ok(content.includes('resolvedStoreName'), 'Must render store name');
    assert.ok(content.includes('resolvedLogo'), 'Must render store logo');
    assert.ok(content.includes('resolvedAddress'), 'Must render store address');
    assert.ok(content.includes('resolvedPhone'), 'Must render store phone');

    // Section 2: Reference & Customer Information
    assert.ok(content.includes('order.order_number'), 'Must display order number');
    assert.ok(content.includes('customerName'), 'Must display customer name');
    assert.ok(content.includes('paymentLabel'), 'Must display payment method');

    // Section 3: Items breakdown
    assert.ok(content.includes('orderedItemsBreakdown'), 'Must render items breakdown header');
    assert.ok(content.includes('unitDual'), 'Must show unit price');
    assert.ok(content.includes('totalDual'), 'Must show line total');

    // Section 4: Totals & Watermark
    assert.ok(content.includes('subtotalDual'), 'Must render subtotal');
    assert.ok(content.includes('grandTotalDual'), 'Must render grand total');
    assert.ok(content.includes('auditWatermark'), 'Must render verification audit watermark');
  });

  it('ReceiptsPage mounts print stage and invokes printReceiptHtml on print click', () => {
    const pageFile = path.join(portalSrc, 'features/orders/ReceiptsPage.tsx');
    assert.ok(fs.existsSync(pageFile), 'ReceiptsPage.tsx must exist');

    const content = fs.readFileSync(pageFile, 'utf8');
    assert.ok(content.includes('printReceiptHtml'), 'Must import printReceiptHtml');
    assert.ok(content.includes('printRenderRef'), 'Must declare printRenderRef');
    assert.ok(content.includes('triggerDirectPrint'), 'Must implement triggerDirectPrint');
    assert.ok(content.includes('receipt-print-stage'), 'Must render hidden print staging element');
    assert.ok(!content.includes('window.addEventListener(\'afterprint\', cleanup'), 'Must not have premature unmount on window afterprint');
  });

  it('All receipt translation keys exist in both Khmer and English', () => {
    const enFile = path.join(portalSrc, 'locales/en/receipts.json');
    const khFile = path.join(portalSrc, 'locales/kh/receipts.json');

    const en = JSON.parse(fs.readFileSync(enFile, 'utf8'));
    const kh = JSON.parse(fs.readFileSync(khFile, 'utf8'));

    const requiredKeys = [
      'officialReceiptTitle',
      'officialReceiptSubtitle',
      'receiptNo',
      'dateCol',
      'customerInfo',
      'transactionDetails',
      'orderedItemsBreakdown',
      'productDescription',
      'quantity',
      'unitPrice',
      'lineTotal',
      'subtotal',
      'grandTotal',
      'paidAmount',
      'balanceDue',
      'thankYouTitle',
      'print',
    ];

    for (const key of requiredKeys) {
      assert.ok(en[key], `English translation must have "${key}"`);
      assert.ok(kh[key], `Khmer translation must have "${key}"`);
    }

    // Verify delivered status is localized to fix receipts.statuses.delivered bug
    assert.equal(kh.statuses?.delivered, 'បានដឹកជញ្ជូនរួចរាល់', 'Khmer must translate delivered status');
    assert.equal(en.statuses?.delivered, 'Delivered', 'English must translate delivered status');
  });

  it('GlobalPrintDocument and printDocumentHtml are exported and used across pages', () => {
    const globalDocFile = path.join(portalSrc, 'components/common/GlobalPrintDocument.tsx');
    const printDocFile = path.join(portalSrc, 'utils/printDocument.ts');
    const commonIndex = path.join(portalSrc, 'components/common/index.ts');

    assert.ok(fs.existsSync(globalDocFile), 'GlobalPrintDocument.tsx must exist');
    assert.ok(fs.existsSync(printDocFile), 'printDocument.ts must exist');

    const indexContent = fs.readFileSync(commonIndex, 'utf8');
    assert.ok(indexContent.includes('GlobalPrintDocument'), 'Must export GlobalPrintDocument from common');

    // Verify OrderDetailPage uses printDocumentHtml
    const orderDetailFile = path.join(portalSrc, 'features/orders/OrderDetailPage.tsx');
    const orderDetailContent = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(orderDetailContent.includes('printDocumentHtml'), 'OrderDetailPage must use printDocumentHtml');

    // Verify POSReceiptModal uses printDocumentHtml
    const posModalFile = path.join(portalSrc, 'features/pos/POSReceiptModal.tsx');
    const posModalContent = fs.readFileSync(posModalFile, 'utf8');
    assert.ok(posModalContent.includes('printDocumentHtml'), 'POSReceiptModal must use printDocumentHtml');

    // Verify OrderDetailsModal uses printDocumentHtml
    const orderModalFile = path.join(portalSrc, 'features/orders/OrderDetailsModal.tsx');
    const orderModalContent = fs.readFileSync(orderModalFile, 'utf8');
    assert.ok(orderModalContent.includes('printDocumentHtml'), 'OrderDetailsModal must use printDocumentHtml');
  });
});
