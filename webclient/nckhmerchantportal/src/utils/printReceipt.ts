export interface PrintReceiptOptions {
  title?: string;
  onBeforePrint?: () => void;
  onAfterPrint?: () => void;
}

/**
 * Robust, isolated receipt printing via a sandboxed hidden iframe.
 * Eliminates parent window CSS contamination, invisible page overflow stretching,
 * and premature React unmount race conditions in Chromium/WebKit engines.
 */
export function printReceiptHtml(
  htmlContent: string,
  options: PrintReceiptOptions = {}
): HTMLIFrameElement {
  const { title = 'Receipt Voucher', onBeforePrint, onAfterPrint } = options;

  // 1. Remove any previous receipt print iframe to avoid stale memory leaks
  const existingFrame = document.getElementById('receipt-hidden-print-frame');
  if (existingFrame && existingFrame.parentNode) {
    existingFrame.parentNode.removeChild(existingFrame);
  }

  // 2. Create isolated hidden print iframe with standard printable viewport
  const iframe = document.createElement('iframe');
  iframe.id = 'receipt-hidden-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '1024px';
  iframe.style.height = '1000px';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-9999';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    window.print();
    return iframe;
  }

  // 3. Clone stylesheets and fonts, excluding parent display:none print isolation rules
  const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .filter((node) => {
      const text = node.textContent || '';
      return !text.includes('#direct-print-portal') && !text.includes('#global-print-active-canvas');
    })
    .map((node) => node.outerHTML)
    .join('\n');

  iframeDoc.open();
  iframeDoc.write(`<!DOCTYPE html>
<html lang="km">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:ital,wght@0,100..700;1,100..700&display=swap" rel="stylesheet">
  ${headStyles}
  <style>
    @page {
      size: A4 portrait !important;
      margin: 8mm 10mm !important;
    }
    * {
      box-sizing: border-box !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: 'Kantumruy Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      width: 100% !important;
      min-height: 100% !important;
    }
    #print-voucher-wrapper,
    #direct-print-portal,
    #direct-print-voucher-root {
      display: block !important;
      visibility: visible !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
    }
  </style>
</head>
<body>
  <div id="print-voucher-wrapper" class="direct-print-portal">
    ${htmlContent}
  </div>
</body>
</html>`);
  iframeDoc.close();

  onBeforePrint?.();

  // 4. Focus and trigger print after browser computes DOM and layout
  const executePrint = () => {
    try {
      const win = iframe.contentWindow;
      if (win) {
        if (onAfterPrint) {
          win.addEventListener('afterprint', onAfterPrint, { once: true });
        }
        win.focus();
        win.print();
      } else {
        window.print();
      }
    } catch (err) {
      console.warn('Iframe print failed, falling back to window print', err);
      window.print();
    }
  };

  if ((iframeDoc as any).fonts && (iframeDoc as any).fonts.ready) {
    (iframeDoc as any).fonts.ready
      .then(() => setTimeout(executePrint, 150))
      .catch(() => setTimeout(executePrint, 250));
  } else {
    setTimeout(executePrint, 250);
  }

  return iframe;
}

export default printReceiptHtml;
