import React from 'react';
import { ShieldCheck, Heart } from 'lucide-react';

export interface GlobalPrintInfoRow {
  label: string;
  value: React.ReactNode;
}

export interface GlobalPrintInfoCard {
  title: string;
  badge?: string;
  rows: GlobalPrintInfoRow[];
}

export interface GlobalPrintColumn {
  key: string;
  title: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (row: any, idx: number) => React.ReactNode;
}

export interface GlobalPrintSummaryRow {
  label: string;
  valueUsd?: number | string;
  valueKhr?: number | string;
  rawText?: string;
  isTotal?: boolean;
}

export interface GlobalPrintDocumentProps {
  language?: string;
  store: {
    name: string;
    tagline?: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
  };
  document: {
    title: string;
    subtitle?: string;
    referenceNumber?: string;
    date: string;
    statusBadge?: {
      text: string;
      variant?: 'paid' | 'pending' | 'delivered' | 'completed' | 'cancelled';
    };
    channelLabel?: string;
  };
  infoCards?: GlobalPrintInfoCard[];
  columns: GlobalPrintColumn[];
  rows: Array<Record<string, any>>;
  summary?: {
    notesTitle?: string;
    notesText?: string;
    rows: GlobalPrintSummaryRow[];
    paidAmount?: { usd: number; khr: number };
    balanceDue?: { usd: number; khr: number };
  };
  signatures?: {
    preparedByTitle?: string;
    preparedByName?: string;
    approvedByTitle?: string;
    approvedByName?: string;
  };
  footer?: {
    thankYouText?: string;
    systemWatermark?: string;
    pageText?: string;
  };
}

export const GlobalPrintDocument: React.FC<GlobalPrintDocumentProps> = ({
  language = 'kh',
  store,
  document: doc,
  infoCards = [],
  columns,
  rows,
  summary,
  signatures,
  footer,
}) => {
  const isKm = language === 'kh';

  // Format Dual Currency Helper
  const formatDual = (amt: number | string = 0) => {
    const num = Number(amt) || 0;
    const khr = Math.round(num * 4100);
    return {
      usdStr: `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      khrStr: `៛${khr.toLocaleString('en-US')}`,
    };
  };

  const getStatusBadgeClass = (variant?: string) => {
    switch (variant) {
      case 'paid':
      case 'delivered':
      case 'completed':
        return 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]';
      case 'pending':
        return 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]';
      case 'cancelled':
        return 'bg-[#fff1f2] text-[#e11d48] border-[#fecdd3]';
      default:
        return 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]';
    }
  };

  return (
    <div
      id="global-print-document-root"
      className="w-full bg-white text-[#0f172a] font-['Kantumruy_Pro','Inter',sans-serif] text-[10.5px] p-6 leading-[1.4] select-none [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
    >
      {/* ─── 1. Header Section ────────────────────────────────────────────── */}
      <div className="w-full pb-3 mb-3.5 border-b-2 border-[#e2e8f0]">
        <div className="flex justify-between items-start gap-4">
          {/* Left Column: Brand Logo + Clean Store Identity */}
          <div className="flex items-start gap-3 max-w-[55%]">
            <div className="w-12 h-12 min-w-12 min-h-12 rounded-lg border border-[#e2e8f0] bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden">
              {store.logo ? (
                <img
                  src={store.logo}
                  alt={store.name}
                  className="w-full h-full object-contain block shrink-0"
                />
              ) : (
                <div className="w-full h-full bg-[#0f172a] text-white rounded flex items-center justify-center font-bold text-sm">
                  {store.name.charAt(0).toUpperCase() || 'M'}
                </div>
              )}
            </div>

            <div className="space-y-0.5 text-xs text-[#0f172a]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-bold text-base tracking-tight text-[#0f172a] leading-tight">
                  {store.name}
                </h1>
                <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  {isKm ? 'ផ្លូវការ' : 'Official'}
                </span>
              </div>
              {store.tagline && (
                <p className="text-[9.5px] text-[#64748b] leading-tight mt-0.5">
                  {store.tagline}
                </p>
              )}
              <div className="text-[8.5px] text-[#64748b] leading-tight pt-0.5 space-y-0.5">
                {store.address && <p>{store.address}</p>}
                <p>
                  {isKm ? 'ទូរស័ព្ទ៖' : 'Tel:'} {store.phone || '—'}
                  {store.email && ` · ${store.email}`}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Document Title & Metadata */}
          <div className="text-right space-y-1 min-w-[220px] max-w-[45%] shrink-0">
            <div>
              <h2 className="text-[13.5px] font-bold uppercase tracking-tight text-[#0f172a] leading-tight">
                {doc.title}
              </h2>
              {doc.subtitle && (
                <p className="text-[8.5px] font-bold tracking-widest text-[#94a3b8] uppercase mt-0.5">
                  {doc.subtitle}
                </p>
              )}
            </div>

            <div className="space-y-0.5 pt-0.5 text-[9px] text-[#475569]">
              {doc.referenceNumber && (
                <div className="flex justify-end items-baseline gap-1.5">
                  <span className="font-semibold text-[#64748b]">
                    {isKm ? 'លេខកូដសម្គាល់៖' : 'Ref #:'}
                  </span>
                  <span className="font-['Inter'] font-bold text-[9.5px] text-[#0f172a]">
                    {doc.referenceNumber}
                  </span>
                </div>
              )}

              <div className="flex justify-end items-baseline gap-1.5">
                <span className="text-[#64748b]">
                  {isKm ? 'កាលបរិច្ឆេទ៖' : 'Date:'}
                </span>
                <span className="font-medium text-[#0f172a]">
                  {doc.date}
                </span>
              </div>

              {doc.statusBadge && (
                <div className="flex justify-end items-baseline gap-1.5 pt-0.5">
                  <span className="text-[#64748b]">
                    {isKm ? 'ស្ថានភាព៖' : 'Status:'}
                  </span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-bold uppercase border ${getStatusBadgeClass(
                      doc.statusBadge.variant
                    )}`}
                  >
                    {doc.statusBadge.text}
                  </span>
                </div>
              )}

              {doc.channelLabel && (
                <div className="flex justify-end items-baseline gap-1.5 text-[8.5px]">
                  <span className="text-[#64748b]">{isKm ? 'ប្រភពលក់៖' : 'Channel:'}</span>
                  <span className="font-semibold text-[#0f172a]">{doc.channelLabel}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. Two-Column Info Cards ─────────────────────────────────────── */}
      {infoCards && infoCards.length > 0 && (
        <div className="grid grid-cols-2 gap-3 my-3">
          {infoCards.map((card, idx) => (
            <div
              key={idx}
              className="border border-[#e2e8f0] rounded-lg p-2.5 bg-[#f8fafc] text-[9px]"
            >
              <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-1.5 mb-1.5">
                <span className="font-bold uppercase tracking-wider text-[#334155] text-[8.5px]">
                  {card.title}
                </span>
                {card.badge && (
                  <span className="text-[8px] px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-700 font-semibold">
                    {card.badge}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {card.rows.map((r, rIdx) => (
                  <div key={rIdx} className="flex justify-between items-center text-[9px]">
                    <span className="text-[#64748b]">{r.label}</span>
                    <span className="font-semibold text-[#0f172a] text-right">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── 3. Items / Data Table ────────────────────────────────────────── */}
      <div className="border border-[#e2e8f0] rounded-lg overflow-hidden my-3">
        <table className="w-full text-left border-collapse text-[9.5px]">
          <thead>
            <tr className="bg-[#f1f5f9] text-[#334155] font-bold text-[8.5px] uppercase tracking-wider border-b border-[#e2e8f0]">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`p-2 border border-[#e2e8f0] ${
                    c.align === 'center'
                      ? 'text-center'
                      : c.align === 'right'
                      ? 'text-right'
                      : 'text-left'
                  } ${c.width || ''}`}
                >
                  {c.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2e8f0]">
            {rows.length > 0 ? (
              rows.map((row, rIdx) => {
                const isEven = rIdx % 2 === 1;
                return (
                  <tr key={rIdx} className={isEven ? 'bg-[#fbfcfd]' : 'bg-white'}>
                    {columns.map((c) => {
                      const cellVal = c.render ? c.render(row, rIdx) : row[c.key];
                      return (
                        <td
                          key={c.key}
                          className={`p-2 border border-[#e2e8f0] ${
                            c.align === 'center'
                              ? 'text-center'
                              : c.align === 'right'
                              ? 'text-right'
                              : 'text-left'
                          }`}
                        >
                          {cellVal}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="p-4 text-center text-[#64748b] italic"
                >
                  {isKm ? 'ពុំមានទិន្នន័យកត់ត្រាក្នុងឯកសារនេះឡើយ' : 'No records available'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── 4. Breakdown & Summary Section ───────────────────────────────── */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 mt-3 items-start">
          {/* Left: Notes & Conditions */}
          <div className="border border-[#e2e8f0] rounded-lg p-2.5 bg-[#f8fafc] text-[8.5px] text-[#64748b] space-y-1">
            <div className="font-bold text-[#334155] uppercase tracking-wider border-b border-[#e2e8f0] pb-1">
              {summary.notesTitle || (isKm ? 'កំណត់ចំណាំ និងលក្ខខណ្ឌ' : 'Notes & Conditions')}
            </div>
            <p className="pt-0.5 leading-relaxed">
              {summary.notesText ||
                (isKm
                  ? '* ឯកសារនេះជាភស្តុតាងផ្លូវការនៃការគ្រប់គ្រងអាជីវកម្ម។ សូមរក្សាទុកដើម្បីផ្ទៀងផ្ទាត់ពេលមានបញ្ហា។'
                  : '* This document serves as an official business record. Please retain for verification.')}
            </p>
          </div>

          {/* Right: Financial Breakdown Card */}
          <div className="border border-[#e2e8f0] rounded-lg p-2.5 bg-[#f8fafc] space-y-1">
            {summary.rows.map((s, sIdx) => {
              if (s.isTotal) {
                const dual = s.valueUsd !== undefined ? formatDual(s.valueUsd) : null;
                return (
                  <div
                    key={sIdx}
                    className="pt-1.5 mt-1 border-t-2 border-[#cbd5e1] flex justify-between items-baseline"
                  >
                    <span className="font-bold text-[#0f172a] text-[11px]">{s.label}</span>
                    <div className="text-right">
                      <span className="font-bold text-[#0f172a] text-[12px]">
                        {s.rawText || dual?.usdStr}
                      </span>
                      {dual && (
                        <div className="text-[8.5px] text-[#64748b] font-medium">
                          {dual.khrStr}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              const dual = s.valueUsd !== undefined ? formatDual(s.valueUsd) : null;
              return (
                <div key={sIdx} className="flex justify-between items-center text-[9.5px]">
                  <span className="text-[#64748b]">{s.label}</span>
                  <div className="text-right font-medium text-[#0f172a]">
                    <span>{s.rawText || dual?.usdStr}</span>
                    {dual && s.valueKhr !== undefined && (
                      <span className="text-[8px] text-[#64748b] ml-1">({s.valueKhr})</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Paid / Balance Due Boxes */}
            {summary.paidAmount && (
              <div className="pt-1 mt-1 border-t border-[#e2e8f0] grid grid-cols-2 gap-2 text-[9px]">
                <div className="bg-white border border-[#e2e8f0] rounded p-1.5 text-center">
                  <div className="text-[8px] text-[#64748b] font-medium uppercase">
                    {isKm ? 'បានទូទាត់' : 'Paid'}
                  </div>
                  <div className="font-bold text-[#059669] text-[10px]">
                    ${Number(summary.paidAmount.usd || 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-white border border-[#e2e8f0] rounded p-1.5 text-center">
                  <div className="text-[8px] text-[#64748b] font-medium uppercase">
                    {isKm ? 'នៅខ្វះ' : 'Balance Due'}
                  </div>
                  <div className="font-bold text-[#e11d48] text-[10px]">
                    ${Number(summary.balanceDue?.usd || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 5. Signatures Section ────────────────────────────────────────── */}
      {signatures && (
        <div className="pt-4 border-t border-[#cbd5e1] mt-5 grid grid-cols-2 gap-8 text-[9.5px]">
          <div>
            <div className="font-bold text-[#334155] mb-1">
              {signatures.preparedByTitle || (isKm ? 'អ្នករៀបចំរបាយការណ៍ (Prepared By)' : 'Prepared By')}
            </div>
            <div className="text-[#94a3b8] text-[8.5px] mb-10">
              {isKm ? 'ហត្ថលេខា និងឈ្មោះ' : 'Signature & Name'}
            </div>
            <div className="border-b border-dashed border-[#94a3b8] w-40 mb-1" />
            <div className="font-semibold text-[#0f172a]">
              {signatures.preparedByName || '—'}
            </div>
          </div>

          <div className="text-right flex flex-col items-end">
            <div className="font-bold text-[#334155] mb-1">
              {signatures.approvedByTitle || (isKm ? 'អ្នកត្រួតពិនិត្យ / យល់ព្រម (Approved By)' : 'Approved By')}
            </div>
            <div className="text-[#94a3b8] text-[8.5px] mb-10">
              {isKm ? 'ត្រា និងហត្ថលេខាផ្លូវការ' : 'Official Seal & Signature'}
            </div>
            <div className="border-b border-dashed border-[#94a3b8] w-40 mb-1" />
            <div className="font-semibold text-[#0f172a]">
              {signatures.approvedByName || store.name}
            </div>
          </div>
        </div>
      )}

      {/* ─── 6. Footer Section ────────────────────────────────────────────── */}
      <div className="mt-5 pt-2.5 border-t border-[#e2e8f0] flex items-center justify-between text-[8.5px] text-[#64748b]">
        <div className="flex items-center gap-1 font-medium text-[#475569]">
          <Heart className="w-3 h-3 text-rose-500 fill-rose-500 inline" />
          <span>
            {footer?.thankYouText ||
              (isKm
                ? 'សូមអរគុណចំពោះការគាំទ្រ និងការបញ្ជាទិញពីហាងយើងខ្ញុំ!'
                : 'Thank you for your business and continued support!')}
          </span>
        </div>
        <div className="text-right">
          <span>
            {footer?.systemWatermark || 'Nexa Commerce KH · ប្រព័ន្ធគ្រប់គ្រងអាជីវកម្មឆ្លាតវៃ'}
          </span>
          <span className="ml-2 font-semibold text-[#0f172a]">
            {footer?.pageText || (isKm ? 'ទំព័រ ១ នៃ ១' : 'Page 1 of 1')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GlobalPrintDocument;

