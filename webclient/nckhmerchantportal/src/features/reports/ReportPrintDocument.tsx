import React from 'react';
import { GlobalPrintDocument, GlobalPrintColumn } from '@/components/common/GlobalPrintDocument';

export interface ReportPrintDocumentProps {
  language?: string;
  shopName: string;
  shopLogo?: string;
  shopPhone?: string;
  shopAddress?: string;
  userName?: string;
  periodLabel: string;
  dateRangeStr: string;
  printedAtStr: string;
  channelFilterLabel: string;
  paymentFilterLabel: string;
  categoryFilterLabel: string;
  // Metrics
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  estimatedGrossProfit: number;
  profitMarginPercent: number;
  fulfillmentRate: number;
  stockUtilization: number;
  returnRefundRate: number;
  revenueGrowth: number;
  // Breakdowns
  paymentBreakdown: {
    khqr: number;
    cash: number;
    other: number;
    khqrPct: number;
    cashPct: number;
  };
  topProducts: Array<{
    name: string;
    units: number;
    revenue: number;
    category?: string;
  }>;
  salesRows: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
  stockSummary?: {
    total: number;
    healthy: number;
    lowStock: number;
    outOfStock: number;
  };
  cancelledCount: number;
  cancelledTotal: number;
}

export const ReportPrintDocument: React.FC<ReportPrintDocumentProps> = ({
  language = 'kh',
  shopName,
  shopLogo,
  shopPhone,
  shopAddress,
  userName = 'demo',
  periodLabel,
  dateRangeStr,
  printedAtStr,
  channelFilterLabel,
  paymentFilterLabel,
  categoryFilterLabel,
  totalRevenue,
  totalOrders,
  avgOrderValue,
  estimatedGrossProfit,
  profitMarginPercent,
  fulfillmentRate,
  stockUtilization,
  returnRefundRate,
  revenueGrowth,
  paymentBreakdown,
  topProducts,
  salesRows,
  stockSummary,
  cancelledCount,
  cancelledTotal,
}) => {
  const isKm = language === 'kh';

  // Table Columns
  const columns: GlobalPrintColumn[] = [
    {
      key: 'index',
      title: isKm ? '#' : '#',
      align: 'center',
      width: 'w-10',
      render: (_, idx) => <span className="font-bold text-slate-500">{idx + 1}</span>,
    },
    {
      key: 'name',
      title: isKm ? 'ឈ្មោះមុខទំនិញ / ប្រភព' : 'Item / Source Name',
      align: 'left',
      render: (r) => (
        <div>
          <div className="font-semibold text-slate-900">{r.name}</div>
          {r.category && <div className="text-[8px] text-slate-500">{r.category}</div>}
        </div>
      ),
    },
    {
      key: 'units',
      title: isKm ? 'ចំនួនលក់' : 'Units Sold',
      align: 'center',
      render: (r) => (
        <span className="font-medium text-slate-700">
          {r.units} {isKm ? 'ឯកតា' : 'units'}
        </span>
      ),
    },
    {
      key: 'revenue',
      title: isKm ? 'ចំណូលទទួលបាន' : 'Revenue Total',
      align: 'right',
      render: (r) => {
        const rev = Number(r.revenue || 0);
        const khr = Math.round(rev * 4100);
        return (
          <div className="text-right">
            <span className="font-bold text-slate-900">${rev.toFixed(2)}</span>
            <div className="text-[8px] text-slate-500 font-mono">៛{khr.toLocaleString('en-US')}</div>
          </div>
        );
      },
    },
    {
      key: 'share',
      title: isKm ? 'ភាគរយ' : 'Share %',
      align: 'right',
      render: (r) => {
        const share = totalRevenue > 0 ? ((Number(r.revenue || 0) / totalRevenue) * 100).toFixed(1) : '0.0';
        return <span className="font-semibold text-slate-800">{share}%</span>;
      },
    },
  ];

  // Map rows: Top products first, or sales rows fallback
  const rows = topProducts.length > 0
    ? topProducts.slice(0, 10).map((p) => ({
        name: p.name,
        category: p.category,
        units: p.units,
        revenue: p.revenue,
      }))
    : salesRows.slice(0, 10).map((s) => ({
        name: `${isKm ? 'ការលក់ថ្ងៃទី' : 'Sales on'} ${s.date}`,
        units: s.orders,
        revenue: s.revenue,
      }));

  // Dual Currency Calculations
  const revenueUsd = totalRevenue || 0;
  const revenueKhr = Math.round(revenueUsd * 4100);
  const revenueKhrStr = `៛${revenueKhr.toLocaleString('en-US')}`;
  const profitUsd = estimatedGrossProfit || 0;
  const profitKhr = Math.round(profitUsd * 4100);

  return (
    <GlobalPrintDocument
      language={language}
      store={{
        name: shopName,
        tagline: isKm ? 'ភោជនីយដ្ឋាន និងហាងទំនិញទំនើប · ប្រព័ន្ធគ្រប់គ្រងការលក់' : 'Retail & Restaurant Commerce',
        address: shopAddress || (isKm ? 'រាជធានីភ្នំពេញ ប្រទេសកម្ពុជា' : 'Phnom Penh, Cambodia'),
        phone: shopPhone || '+855 (0) 23 888 888',
        email: 'info@ministorekh.com',
        logo: shopLogo,
      }}
      document={{
        title: isKm ? 'របាយការណ៍អាជីវកម្មផ្លូវការ' : 'Official Business Report',
        subtitle: isKm ? 'របាយការណ៍ប្រតិបត្តិការលក់ និងហិរញ្ញវត្ថុ' : 'Executive Sales & Operations Report',
        referenceNumber: `REP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        date: dateRangeStr,
        statusBadge: {
          text: isKm ? 'បានផ្ទៀងផ្ទាត់' : 'Verified',
          variant: 'paid',
        },
        channelLabel: channelFilterLabel,
      }}
      infoCards={[
        {
          title: isKm ? 'ព័ត៌មានប្រតិបត្តិការ (Operations Summary)' : 'Operations Summary',
          badge: periodLabel,
          rows: [
            { label: isKm ? 'កាលបរិច្ឆេទរបាយការណ៍៖' : 'Period:', value: dateRangeStr },
            { label: isKm ? 'ជម្រើសពេល៖' : 'Range:', value: periodLabel },
            { label: isKm ? 'ប្រភពលក់៖' : 'Channel:', value: channelFilterLabel },
            { label: isKm ? 'វិធីទូទាត់៖' : 'Payment:', value: paymentFilterLabel },
            { label: isKm ? 'ប្រភេទមុខទំនិញ៖' : 'Category:', value: categoryFilterLabel },
          ],
        },
        {
          title: isKm ? 'សូចនាករសំខាន់ៗ (Key Performance Indicators)' : 'Key Metrics (KPIs)',
          badge: isKm ? 'បច្ចុប្បន្នភាព' : 'Live Data',
          rows: [
            { label: isKm ? 'ការបញ្ជាទិញសរុប៖' : 'Total Orders:', value: `${totalOrders} ${isKm ? 'វិក្កយបត្រ' : 'orders'}` },
            { label: isKm ? 'អត្រាជោគជ័យ (Fulfillment)៖' : 'Fulfillment Rate:', value: `${fulfillmentRate}%` },
            { label: isKm ? 'មធ្យមភាគ / វិក្កយបត្រ (AOV)៖' : 'Avg Order Value:', value: `$${(avgOrderValue || 0).toFixed(2)}` },
            { label: isKm ? 'Margin ចំណេញប៉ាន់ស្មាន៖' : 'Est. Profit Margin:', value: `${profitMarginPercent.toFixed(1)}%` },
            { label: isKm ? 'សុខភាពស្តុក (Stock Utilization)៖' : 'Stock Utilization:', value: `${stockUtilization}%` },
          ],
        },
      ]}
      columns={columns}
      rows={rows}
      summary={{
        notesTitle: isKm ? 'កំណត់ចំណាំ និងការបញ្ជាក់' : 'Notes & Verification',
        notesText: isKm
          ? '* របាយការណ៍នេះត្រូវបានបង្កើតឡើងដោយស្វ័យប្រវត្តពីប្រព័ន្ធគ្រប់គ្រងអាជីវកម្ម Nexa Commerce KH ផ្អែកលើទិន្នន័យជាក់ស្តែង។ ឯកសារនេះប្រើប្រាស់សម្រាប់ការគ្រប់គ្រងផ្ទៃក្នុង និងការផ្ទៀងផ្ទាត់ហិរញ្ញវត្ថុ។'
          : '* This report is automatically generated by Nexa Commerce KH Business Intelligence Engine based on verified database records. Strictly for internal accounting & management control.',
        rows: [
          {
            label: isKm ? 'ចំណូលលក់ទំនិញសរុប (Subtotal):' : 'Items Subtotal:',
            valueUsd: revenueUsd,
            valueKhr: `៛${revenueKhr.toLocaleString('en-US')}`,
          },
          ...(cancelledCount > 0
            ? [
                {
                  label: isKm ? `ការកុម្ម៉ង់បោះបង់ (${cancelledCount} វិក្កយបត្រ):` : `Cancelled Orders (${cancelledCount}):`,
                  rawText: `-$${cancelledTotal.toFixed(2)}`,
                },
              ]
            : []),
          {
            label: isKm ? 'ចំណូលលក់សរុបសុទ្ធ (Grand Total):' : 'Net Total Revenue:',
            valueUsd: revenueUsd,
            valueKhr: `៛${revenueKhr.toLocaleString('en-US')}`,
            isTotal: true,
          },
        ],
        paidAmount: { usd: revenueUsd, khr: revenueKhr },
        balanceDue: { usd: profitUsd, khr: profitKhr },
      }}
      signatures={{
        preparedByTitle: isKm ? 'អ្នករៀបចំរបាយការណ៍ (Prepared By)' : 'Prepared By',
        preparedByName: userName,
        approvedByTitle: isKm ? 'អ្នកត្រួតពិនិត្យ / យល់ព្រម (Approved By)' : 'Approved By',
        approvedByName: shopName,
      }}
      footer={{
        thankYouText: isKm
          ? 'សូមអរគុណចំពោះការគាំទ្រ និងការបញ្ជាទិញពីហាងយើងខ្ញុំ!'
          : 'Thank you for your business and continuous support!',
        systemWatermark: 'Nexa Commerce KH · ប្រព័ន្ធគ្រប់គ្រងអាជីវកម្មឆ្លាតវៃ',
        pageText: isKm ? 'ទំព័រ ១ នៃ ១' : 'Page 1 of 1',
      }}
    />
  );
};

export default ReportPrintDocument;
