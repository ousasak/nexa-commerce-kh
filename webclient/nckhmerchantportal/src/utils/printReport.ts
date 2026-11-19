export interface PrintReportOptions {
  title?: string;
  onBeforePrint?: () => void;
  onAfterPrint?: () => void;
}

/**
 * Robust, isolated business report printing via a sandboxed hidden iframe.
 * Eliminates parent window CSS contamination, screen responsive layout distortion,
 * and ensures clean A4 print preview with exact colors and Kantumruy Pro typography.
 */
export function printReportHtml(
  htmlContent: string,
  options: PrintReportOptions = {}
): HTMLIFrameElement {
  const { title = 'Business Report', onBeforePrint, onAfterPrint } = options;

  // 1. Remove any previous report print iframe to avoid stale memory leaks
  const existingFrame = document.getElementById('report-hidden-print-frame');
  if (existingFrame && existingFrame.parentNode) {
    existingFrame.parentNode.removeChild(existingFrame);
  }

  // 2. Create isolated hidden print iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'report-hidden-print-frame';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
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

  // 3. Clone all stylesheets, style tags, and fonts from the parent document
  const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
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
      margin: 10mm 12mm !important;
    }
    * {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: 'Kantumruy Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      width: 100% !important;
      min-height: 100% !important;
    }
    #print-report-wrapper {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
    }
    table {
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
  </style>
</head>
<body>
  <div id="print-report-wrapper">
    ${htmlContent}
  </div>
</body>
</html>`);
  iframeDoc.close();

  onBeforePrint?.();

  // 4. Focus and trigger print after browser computes DOM and layout
  setTimeout(() => {
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
  }, 250);

  return iframe;
}

export default printReportHtml;
