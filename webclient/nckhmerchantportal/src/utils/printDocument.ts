export interface PrintDocumentOptions {
  title?: string;
  onBeforePrint?: () => void;
  onAfterPrint?: () => void;
}

/**
 * Universal Global Print Engine.
 * Prints documents via an isolated sandboxed hidden iframe.
 * Eliminates parent window CSS contamination, screen responsive layout distortion,
 * and ensures clean A4 print preview with exact colors and Kantumruy Pro typography.
 */
export function printDocumentHtml(
  htmlContent: string,
  options: PrintDocumentOptions = {}
): HTMLIFrameElement {
  const { title = 'Document Voucher', onBeforePrint, onAfterPrint } = options;

  // 1. Remove any previous print iframe to prevent memory leak
  const existingFrame = document.getElementById('global-hidden-print-frame');
  if (existingFrame && existingFrame.parentNode) {
    existingFrame.parentNode.removeChild(existingFrame);
  }

  // 2. Create isolated hidden print iframe with standard printable viewport
  const iframe = document.createElement('iframe');
  iframe.id = 'global-hidden-print-frame';
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

  // 3. Clone all stylesheets, style tags, and fonts, excluding parent print isolation rules
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Kantumruy+Pro:ital,wght@0,100..700;1,100..700&display=swap" rel="stylesheet">
  ${headStyles}
  <style>
    @page {
      size: a4 portrait !important;
      margin: 8mm 10mm !important;
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
      font-family: 'Kantumruy Pro', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      width: 100% !important;
      min-height: 100% !important;
      font-size: 10.5px !important;
      line-height: 1.4 !important;
    }
    #global-print-wrapper,
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
    table {
      border-collapse: collapse !important;
      page-break-inside: auto !important;
    }
    tr {
      page-break-inside: avoid !important;
      page-break-after: auto !important;
    }
  </style>
</head>
<body>
  <div id="global-print-wrapper" class="direct-print-portal">
    ${htmlContent}
  </div>
</body>
</html>`);
  iframeDoc.close();

  onBeforePrint?.();

  // 4. Focus and trigger print after layout settles
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

