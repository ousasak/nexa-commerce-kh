<?php

namespace App\Services\Reports;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Shop;
use Carbon\Carbon;

class SalesReportService
{
    /**
     * Generate Daily Sales Report for current business day.
     */
    public function getDailyReport(Shop $shop, ?Carbon $date = null, string $lang = 'kh'): array
    {
        $targetDate = $date ? clone $date : Carbon::today();
        $start = (clone $targetDate)->startOfDay();
        $end = (clone $targetDate)->endOfDay();

        // Previous equivalent period: Yesterday
        $prevStart = (clone $start)->subDay()->startOfDay();
        $prevEnd = (clone $start)->subDay()->endOfDay();

        return $this->buildReport($shop, 'daily', 1, $start, $end, $prevStart, $prevEnd, $lang);
    }

    /**
     * Generate Weekly Sales Report for the last 7 calendar days.
     */
    public function getWeeklyReport(Shop $shop, ?Carbon $endDate = null, string $lang = 'kh'): array
    {
        $end = $endDate ? clone $endDate : Carbon::now();
        $start = (clone $end)->subDays(6)->startOfDay();

        // Previous equivalent period: 7 days prior
        $prevEnd = (clone $start)->subSecond();
        $prevStart = (clone $prevEnd)->subDays(6)->startOfDay();

        return $this->buildReport($shop, 'weekly', 7, $start, $end, $prevStart, $prevEnd, $lang);
    }

    /**
     * Generate Monthly Sales Report for the last 30 calendar days.
     */
    public function getMonthlyReport(Shop $shop, ?Carbon $endDate = null, string $lang = 'kh'): array
    {
        $end = $endDate ? clone $endDate : Carbon::now();
        $start = (clone $end)->subDays(29)->startOfDay();

        // Previous equivalent period: 30 days prior
        $prevEnd = (clone $start)->subSecond();
        $prevStart = (clone $prevEnd)->subDays(29)->startOfDay();

        return $this->buildReport($shop, 'monthly', 30, $start, $end, $prevStart, $prevEnd, $lang);
    }

    /**
     * Core reporting engine and calculations using real database records.
     */
    protected function buildReport(
        Shop $shop,
        string $periodType,
        int $periodDays,
        Carbon $start,
        Carbon $end,
        Carbon $prevStart,
        Carbon $prevEnd,
        string $lang = 'kh'
    ): array {
        $isKh = $lang === 'kh';
        $shopName = htmlspecialchars($shop->shop_name ?: $shop->username, ENT_QUOTES, 'UTF-8');

        // 1. Current Period Paid Qualifying Orders (Excluding cancelled/voided/rejected)
        $paidOrders = Order::where('shop_id', $shop->id)
            ->whereBetween('created_at', [$start, $end])
            ->where('payment_status', 'paid')
            ->whereNotIn('order_status', ['cancelled', 'voided', 'rejected'])
            ->get();

        $totalRevenue = round((float) $paidOrders->sum('total'), 2);
        $totalOrders = $paidOrders->count();
        $avgOrderValue = $totalOrders > 0 ? round($totalRevenue / $totalOrders, 2) : 0.0;

        // 2. Previous Period Orders for Comparison
        $prevPaidOrders = Order::where('shop_id', $shop->id)
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->where('payment_status', 'paid')
            ->whereNotIn('order_status', ['cancelled', 'voided', 'rejected'])
            ->get();

        $prevRevenue = round((float) $prevPaidOrders->sum('total'), 2);
        $prevOrders = $prevPaidOrders->count();

        if ($prevRevenue > 0) {
            $revenueGrowth = round((($totalRevenue - $prevRevenue) / $prevRevenue) * 100, 1);
        } else {
            $revenueGrowth = $totalRevenue > 0 ? 100.0 : 0.0;
        }

        if ($prevOrders > 0) {
            $ordersGrowth = round((($totalOrders - $prevOrders) / $prevOrders) * 100, 1);
        } else {
            $ordersGrowth = $totalOrders > 0 ? 100.0 : 0.0;
        }

        // 3. Order Items & Total Units Sold
        $orderIds = $paidOrders->pluck('id')->toArray();
        $orderItems = ! empty($orderIds)
            ? OrderItem::whereIn('order_id', $orderIds)->get()
            : collect();

        $totalItemsSold = (int) $orderItems->sum('quantity');

        // 4. Reliable Product Cost & Estimated Profit (Only when authentic cost data exists)
        $productIds = $orderItems->pluck('product_id')->filter()->unique()->toArray();
        $productsMap = ! empty($productIds)
            ? Product::whereIn('id', $productIds)->get()->keyBy('id')
            : collect();

        $totalCost = 0.0;
        $costDataAvailableCount = 0;
        $totalItemsEvaluated = 0;

        foreach ($orderItems as $item) {
            $prod = $item->product_id ? ($productsMap[$item->product_id] ?? null) : null;
            $unitCost = null;

            if ($prod) {
                $meta = ! empty($prod->metadata_json) ? json_decode($prod->metadata_json, true) : [];
                $customAttrs = ! empty($prod->custom_attributes) ? json_decode($prod->custom_attributes, true) : [];

                if (isset($meta['cost']) && is_numeric($meta['cost'])) {
                    $unitCost = (float) $meta['cost'];
                } elseif (isset($meta['cost_price']) && is_numeric($meta['cost_price'])) {
                    $unitCost = (float) $meta['cost_price'];
                } elseif (isset($customAttrs['cost']) && is_numeric($customAttrs['cost'])) {
                    $unitCost = (float) $customAttrs['cost'];
                }
            }

            if ($unitCost !== null && $unitCost >= 0) {
                $totalCost += ($unitCost * (int) $item->quantity);
                $costDataAvailableCount++;
            }
            $totalItemsEvaluated++;
        }

        // We only report profit if reliable cost data actually exists for the products
        $hasReliableCostData = ($totalItemsEvaluated > 0 && $costDataAvailableCount === $totalItemsEvaluated);
        $estimatedProfit = $hasReliableCostData ? round(max(0.0, $totalRevenue - $totalCost), 2) : null;
        $profitMargin = ($hasReliableCostData && $totalRevenue > 0)
            ? round(($estimatedProfit / $totalRevenue) * 100, 1)
            : null;

        // 5. Payment Method Breakdown (Calculated by actual payment amount and order count)
        $paymentMethods = [
            'khqr' => ['name' => $isKh ? 'ABA KHQR / Bakong' : 'ABA KHQR / Bakong', 'count' => 0, 'amount' => 0.0],
            'cash' => ['name' => $isKh ? 'សាច់ប្រាក់ (Cash / COD)' : 'Cash on Delivery', 'count' => 0, 'amount' => 0.0],
            'other' => ['name' => $isKh ? 'ផ្សេងៗ (Other)' : 'Other', 'count' => 0, 'amount' => 0.0],
        ];

        foreach ($paidOrders as $o) {
            $method = strtolower($o->payment_method ?? '');
            $orderTotal = (float) $o->total;

            if (str_contains($method, 'khqr') || str_contains($method, 'bakong') || str_contains($method, 'aba') || str_contains($method, 'qr')) {
                $paymentMethods['khqr']['count']++;
                $paymentMethods['khqr']['amount'] += $orderTotal;
            } elseif (str_contains($method, 'cash') || str_contains($method, 'cod')) {
                $paymentMethods['cash']['count']++;
                $paymentMethods['cash']['amount'] += $orderTotal;
            } else {
                $paymentMethods['other']['count']++;
                $paymentMethods['other']['amount'] += $orderTotal;
            }
        }

        foreach ($paymentMethods as $key => &$data) {
            $data['percentage'] = $totalRevenue > 0
                ? round(($data['amount'] / $totalRevenue) * 100, 1)
                : 0.0;
            $data['amount'] = round($data['amount'], 2);
        }
        unset($data);

        // 6. Top 5 Best-Selling Products
        $productAggregates = [];
        foreach ($orderItems as $item) {
            $name = $item->product_name ?: 'Product #'.$item->product_id;
            if (! isset($productAggregates[$name])) {
                $productAggregates[$name] = [
                    'name' => $name,
                    'units' => 0,
                    'revenue' => 0.0,
                ];
            }
            $productAggregates[$name]['units'] += (int) $item->quantity;
            $productAggregates[$name]['revenue'] += ((float) $item->price * (int) $item->quantity);
        }

        uasort($productAggregates, function ($a, $b) {
            if ($b['revenue'] == $a['revenue']) {
                return $b['units'] <=> $a['units'];
            }
            return $b['revenue'] <=> $a['revenue'];
        });

        $top5Products = array_slice(array_values($productAggregates), 0, 5);

        // 7. Inventory & Stock Status
        $activeProductsCount = Product::where('shop_id', $shop->id)->where('status', 'active')->count();

        $allShopProducts = Product::where('shop_id', $shop->id)->get();
        $outOfStockList = [];
        $lowStockList = [];

        foreach ($allShopProducts as $prod) {
            $qty = (int) ($prod->quantity ?? 0);
            if ($qty <= 0) {
                $outOfStockList[] = ['name' => $prod->name, 'quantity' => 0];
            } elseif ($qty <= 5) {
                $lowStockList[] = ['name' => $prod->name, 'quantity' => $qty];
            }
        }

        $outOfStockCount = count($outOfStockList);
        $lowStockCount = count($lowStockList);

        // 8. Daily Revenue Breakdown (for Weekly / Monthly)
        $dailyBreakdown = [];
        if ($periodDays > 1) {
            $buckets = [];
            $currentDay = clone $start;
            while ($currentDay->lte($end)) {
                $dateKey = $currentDay->format('Y-m-d');
                $buckets[$dateKey] = [
                    'date' => $dateKey,
                    'day_label' => $isKh
                        ? $currentDay->locale('km')->isoFormat('dd D/MM')
                        : $currentDay->format('D, M d'),
                    'orders' => 0,
                    'revenue' => 0.0,
                ];
                $currentDay->addDay();
            }

            foreach ($paidOrders as $order) {
                $dKey = $order->created_at ? $order->created_at->format('Y-m-d') : null;
                if ($dKey && isset($buckets[$dKey])) {
                    $buckets[$dKey]['orders']++;
                    $buckets[$dKey]['revenue'] += (float) $order->total;
                }
            }

            foreach ($buckets as &$b) {
                $b['revenue'] = round($b['revenue'], 2);
            }
            unset($b);

            $dailyBreakdown = array_values($buckets);
        }

        // 9. Format Dates
        $periodTitle = match ($periodType) {
            'weekly' => $isKh ? 'របាយការណ៍លក់ប្រចាំសប្តាហ៍ (៧ ថ្ងៃចុងក្រោយ)' : 'Weekly Sales Report (Last 7 Days)',
            'monthly' => $isKh ? 'របាយការណ៍លក់ប្រចាំខែ (៣០ ថ្ងៃចុងក្រោយ)' : 'Monthly Sales Report (Last 30 Days)',
            default => $isKh ? 'របាយការណ៍ការលក់ប្រចាំថ្ងៃ' : 'Daily Sales Report',
        };

        $dateRangeStr = $isKh
            ? ($periodDays === 1
                ? $start->locale('km')->isoFormat('D MMMM YYYY')
                : $start->locale('km')->isoFormat('D MMM').' - '.$end->locale('km')->isoFormat('D MMM YYYY'))
            : ($periodDays === 1
                ? $start->format('M d, Y')
                : $start->format('M d').' - '.$end->format('M d, Y'));

        // 10. Generate HTML & Plain text strings
        $html = $this->renderHtmlMessage([
            'isKh' => $isKh,
            'periodTitle' => $periodTitle,
            'periodType' => $periodType,
            'periodDays' => $periodDays,
            'shopName' => $shopName,
            'dateRangeStr' => $dateRangeStr,
            'totalRevenue' => $totalRevenue,
            'totalOrders' => $totalOrders,
            'totalItemsSold' => $totalItemsSold,
            'avgOrderValue' => $avgOrderValue,
            'hasReliableCostData' => $hasReliableCostData,
            'estimatedProfit' => $estimatedProfit,
            'profitMargin' => $profitMargin,
            'revenueGrowth' => $revenueGrowth,
            'ordersGrowth' => $ordersGrowth,
            'prevRevenue' => $prevRevenue,
            'prevOrders' => $prevOrders,
            'paymentMethods' => $paymentMethods,
            'top5Products' => $top5Products,
            'activeProductsCount' => $activeProductsCount,
            'outOfStockCount' => $outOfStockCount,
            'lowStockCount' => $lowStockCount,
            'lowStockList' => array_slice($lowStockList, 0, 3),
            'outOfStockList' => array_slice($outOfStockList, 0, 3),
            'dailyBreakdown' => $dailyBreakdown,
        ]);

        $plain = html_entity_decode(strip_tags(str_replace(['<br>', '<br/>', '</b>', '</div>', '</code>'], "\n", $html)), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $plain = preg_replace("/\n{3,}/", "\n\n", $plain);

        return [
            'shop_id' => $shop->id,
            'shop_name' => $shop->shop_name ?: $shop->username,
            'period' => $periodType,
            'days' => $periodDays,
            'start_date' => $start->toIso8601String(),
            'end_date' => $end->toIso8601String(),
            'language' => $lang,
            'metrics' => [
                'total_revenue' => $totalRevenue,
                'total_orders' => $totalOrders,
                'total_items_sold' => $totalItemsSold,
                'avg_order_value' => $avgOrderValue,
                'has_cost_data' => $hasReliableCostData,
                'estimated_profit' => $estimatedProfit,
                'profit_margin_percent' => $profitMargin,
                'growth_rate' => $revenueGrowth,
                'orders_growth_rate' => $ordersGrowth,
                'prev_revenue' => $prevRevenue,
                'prev_orders' => $prevOrders,
                'active_products_count' => $activeProductsCount,
                'out_of_stock_count' => $outOfStockCount,
                'low_stock_count' => $lowStockCount,
            ],
            'payment_breakdown' => $paymentMethods,
            'top_products' => $top5Products,
            'daily_breakdown' => $dailyBreakdown,
            'html' => $html,
            'plain_text' => $plain,
        ];
    }

    /**
     * Render Telegram HTML message with clean markup and emojis.
     */
    protected function renderHtmlMessage(array $d): string
    {
        $isKh = $d['isKh'];
        $revStr = number_format($d['totalRevenue'], 2);
        $aovStr = number_format($d['avgOrderValue'], 2);
        $growthSign = $d['revenueGrowth'] >= 0 ? '+' : '';
        $growthStr = $growthSign.number_format($d['revenueGrowth'], 1).'%';

        $lines = [];
        $lines[] = "📊 <b>{$d['periodTitle']}</b>";
        $lines[] = "🏪 <b>ហាង៖</b> {$d['shopName']}";
        $lines[] = "📅 <b>កាលបរិច្ឆេទ៖</b> {$d['dateRangeStr']}";
        $lines[] = "━━━━━━━━━━━━━━━━━━━━";

        // Revenue & Orders
        $lines[] = "💰 <b>ចំណូលលក់សរុប:</b> <b>\${$revStr}</b>";
        $lines[] = "🧾 <b>ចំនួនការកុម្ម៉ង់:</b> <b>{$d['totalOrders']}</b> វិក្កយបត្រ";
        $lines[] = "📦 <b>ចំនួនទំនិញលក់បាន:</b> <b>{$d['totalItemsSold']}</b> ឯកតា";
        $lines[] = "🎯 <b>មធ្យមភាគវិក្កយបត្រ (AOV):</b> <b>\${$aovStr}</b>";

        // Growth vs previous period
        if ($d['periodDays'] > 1 || $d['prevOrders'] > 0) {
            $vsLabel = $d['periodDays'] === 1 ? 'ធៀបម្សិលមិញ' : ($d['periodDays'] === 7 ? 'ធៀប ៧ ថ្ងៃមុន' : 'ធៀប ៣០ ថ្ងៃមុន');
            $lines[] = "📈 <b>កំណើនចំណូល:</b> <code>{$growthStr}</code> ({$vsLabel})";
        }

        // Profit (only if authentic cost data exists)
        if ($d['hasReliableCostData'] && $d['estimatedProfit'] !== null) {
            $profitStr = number_format($d['estimatedProfit'], 2);
            $lines[] = "💵 <b>ចំណេញប៉ាន់ស្មាន:</b> \${$profitStr} (Margin: {$d['profitMargin']}%)";
        }

        $lines[] = "━━━━━━━━━━━━━━━━━━━━";

        // Daily breakdown for Weekly / Monthly
        if (! empty($d['dailyBreakdown']) && $d['periodDays'] === 7) {
            $lines[] = "📅 <b>ចំណូលប្រចាំថ្ងៃ (Daily Breakdown):</b>";
            foreach ($d['dailyBreakdown'] as $b) {
                $bRev = number_format($b['revenue'], 2);
                $lines[] = "• {$b['day_label']}: <b>\${$bRev}</b> ({$b['orders']} orders)";
            }
            $lines[] = "━━━━━━━━━━━━━━━━━━━━";
        }

        // Payment Methods
        $lines[] = "💳 <b>វិធីសាស្ត្រទូទាត់ប្រាក់:</b>";
        $hasPayments = false;
        foreach ($d['paymentMethods'] as $pm) {
            if ($pm['count'] > 0) {
                $hasPayments = true;
                $pmAmt = number_format($pm['amount'], 2);
                $lines[] = "• {$pm['name']}: <b>{$pm['count']}</b> ដង (\${$pmAmt} - {$pm['percentage']}%)";
            }
        }
        if (! $hasPayments) {
            $lines[] = "• <i>ពុំមានទិន្នន័យការទូទាត់ទេ</i>";
        }

        $lines[] = "━━━━━━━━━━━━━━━━━━━━";

        // Top 5 Products
        $lines[] = "🏆 <b>ទំនិញលក់ដាច់បំផុត Top 5:</b>";
        if (! empty($d['top5Products'])) {
            foreach ($d['top5Products'] as $idx => $p) {
                $rank = $idx + 1;
                $pRev = number_format($p['revenue'], 2);
                $pName = htmlspecialchars($p['name'], ENT_QUOTES, 'UTF-8');
                $lines[] = "{$rank}. <b>{$pName}</b> — <b>{$p['units']}</b> ឯកតា (\${$pRev})";
            }
        } else {
            $lines[] = "• <i>ពុំមានការលក់ទំនិញក្នុងកំឡុងពេលនេះទេ</i>";
        }

        $lines[] = "━━━━━━━━━━━━━━━━━━━━";

        // Inventory Status
        $lines[] = "📦 <b>ស្ថានភាពស្តុកទំនិញ:</b>";
        $lines[] = "• ទំនិញសកម្មសរុប: <b>{$d['activeProductsCount']}</b> មុខ";
        $lines[] = "• ទំនិញជិតអស់ស្តុក (Low Stock ≤ 5): <b>{$d['lowStockCount']}</b> មុខ";
        $lines[] = "• ទំនិញដាច់ស្តុក (Out of Stock): <b>{$d['outOfStockCount']}</b> មុខ";

        if (! empty($d['lowStockList'])) {
            $lowNames = array_map(fn ($p) => htmlspecialchars($p['name'], ENT_QUOTES, 'UTF-8').' ('.$p['quantity'].')', $d['lowStockList']);
            $lines[] = "  ⚠️ <i>ជិតអស់: ".implode(', ', $lowNames).'</i>';
        }

        $lines[] = "━━━━━━━━━━━━━━━━━━━━";
        $lines[] = "✨ <i>ប្រព័ន្ធគ្រប់គ្រងការលក់ Nexa Commerce KH</i>";

        return implode("\n", $lines);
    }
}

