<?php

namespace App\Http\Controllers\Api\V1\Restaurant;

use App\Helpers\ShopHelper;
use App\Http\Controllers\Controller;
use App\Models\RestaurantTable;
use App\Models\Shop;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class TableController extends Controller
{
    /**
     * Standard 18 table template
     */
    const DEFAULT_TEMPLATE = [
        ['number' => 1, 'seats' => 2, 'section' => 'Main Dining', 'status' => 'available'],
        ['number' => 2, 'seats' => 2, 'section' => 'Main Dining', 'status' => 'available'],
        ['number' => 3, 'seats' => 4, 'section' => 'Main Dining', 'status' => 'available'],
        ['number' => 4, 'seats' => 4, 'section' => 'Main Dining', 'status' => 'available'],
        ['number' => 5, 'seats' => 4, 'section' => 'Main Dining', 'status' => 'available'],
        ['number' => 6, 'seats' => 6, 'section' => 'Main Dining', 'status' => 'available'],
        ['number' => 7, 'seats' => 6, 'section' => 'Main Dining', 'status' => 'cleaning'],
        ['number' => 8, 'seats' => 8, 'section' => 'Main Dining', 'status' => 'available'],
        ['number' => 9, 'seats' => 6, 'section' => 'Private Room', 'status' => 'available'],
        ['number' => 10, 'seats' => 8, 'section' => 'Private Room', 'status' => 'available'],
        ['number' => 11, 'seats' => 10, 'section' => 'Private Room', 'status' => 'available'],
        ['number' => 12, 'seats' => 12, 'section' => 'Private Room', 'status' => 'available'],
        ['number' => 13, 'seats' => 2, 'section' => 'Outdoor', 'status' => 'available'],
        ['number' => 14, 'seats' => 2, 'section' => 'Outdoor', 'status' => 'available'],
        ['number' => 15, 'seats' => 4, 'section' => 'Outdoor', 'status' => 'available'],
        ['number' => 16, 'seats' => 4, 'section' => 'Outdoor', 'status' => 'available'],
        ['number' => 17, 'seats' => 4, 'section' => 'Outdoor', 'status' => 'available'],
        ['number' => 18, 'seats' => 6, 'section' => 'Outdoor', 'status' => 'available'],
    ];

    /**
     * List all tables for a shop (with automatic bootstrap seed if empty)
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $shopId = (int) $request->input('shop_id', $user?->shop_id);

        if (!$shopId) {
            throw new HttpException(400, 'shop_id is required');
        }

        ShopHelper::requireShopAccess($shopId, $user);

        // Check if shop has tables, if not, auto-seed standard 18 tables
        $count = RestaurantTable::where('shop_id', $shopId)->count();
        if ($count === 0) {
            $this->seedDefaultTables($shopId);
        }

        $query = RestaurantTable::where('shop_id', $shopId);

        if ($request->filled('section') && $request->input('section') !== 'all') {
            $query->where('section', $request->input('section'));
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        $tables = $query->orderBy('table_number', 'asc')->get();

        return response()->json($tables->map(fn ($t) => $t->to_dict())->toArray());
    }

    /**
     * Create a new table
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $shopId = (int) $request->input('shop_id', $user?->shop_id);

        if (!$shopId) {
            throw new HttpException(400, 'shop_id is required');
        }

        ShopHelper::requireShopAccess($shopId, $user);

        $tableNumber = (int) $request->input('number', $request->input('table_number', 0));
        if ($tableNumber <= 0) {
            // Pick next available table number
            $maxNum = RestaurantTable::where('shop_id', $shopId)->max('table_number') ?? 0;
            $tableNumber = $maxNum + 1;
        }

        $table = RestaurantTable::create([
            'shop_id' => $shopId,
            'name' => trim((string) $request->input('name', "Table {$tableNumber}")),
            'table_number' => $tableNumber,
            'seats' => (int) $request->input('seats', 4),
            'section' => trim((string) $request->input('section', 'Main Dining')),
            'status' => trim((string) $request->input('status', 'available')),
            'shape' => trim((string) $request->input('shape', 'square')),
            'pos_x' => (int) $request->input('pos_x', 0),
            'pos_y' => (int) $request->input('pos_y', 0),
        ]);

        return response()->json($table->to_dict(), 201);
    }

    /**
     * Get single table
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();
        $table = $this->findTable($id);

        ShopHelper::requireShopAccess($table->shop_id, $user);

        return response()->json($table->to_dict());
    }

    /**
     * Update table
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $table = $this->findTable($id);

        ShopHelper::requireShopAccess($table->shop_id, $user);

        $payload = [];
        if ($request->has('name')) $payload['name'] = trim((string) $request->input('name'));
        if ($request->has('number')) $payload['table_number'] = (int) $request->input('number');
        if ($request->has('seats')) $payload['seats'] = (int) $request->input('seats');
        if ($request->has('section')) $payload['section'] = trim((string) $request->input('section'));
        if ($request->has('status')) $payload['status'] = trim((string) $request->input('status'));
        if ($request->has('shape')) $payload['shape'] = trim((string) $request->input('shape'));
        if ($request->has('posX') || $request->has('pos_x')) $payload['pos_x'] = (int) $request->input('posX', $request->input('pos_x'));
        if ($request->has('posY') || $request->has('pos_y')) $payload['pos_y'] = (int) $request->input('posY', $request->input('pos_y'));
        if ($request->has('currentOrderId') || $request->has('current_order_id')) {
            $payload['current_order_id'] = $request->input('currentOrderId', $request->input('current_order_id'));
        }
        if ($request->has('reservedFor') || $request->has('reserved_for')) {
            $payload['reserved_for'] = $request->input('reservedFor', $request->input('reserved_for'));
        }
        if ($request->has('reservationTime') || $request->has('reservation_time')) {
            $payload['reservation_time'] = $request->input('reservationTime', $request->input('reservation_time'));
        }
        if ($request->has('reservationDate') || $request->has('reservation_date')) {
            $payload['reservation_date'] = $request->input('reservationDate', $request->input('reservation_date'));
        }

        // If status reset to available, clear active order and reservation
        if (isset($payload['status']) && $payload['status'] === 'available') {
            $payload['current_order_id'] = null;
            $payload['reserved_for'] = null;
            $payload['reservation_time'] = null;
            $payload['reservation_date'] = null;
        }

        $table->update($payload);

        return response()->json($table->fresh()->to_dict());
    }

    /**
     * Fast status toggle/patch
     */
    public function updateStatus(Request $request, $id)
    {
        $user = $request->user();
        $table = $this->findTable($id);

        ShopHelper::requireShopAccess($table->shop_id, $user);

        $status = trim((string) $request->input('status', 'available'));
        $payload = ['status' => $status];

        if ($request->has('currentOrderId')) {
            $payload['current_order_id'] = $request->input('currentOrderId');
        }
        if ($request->has('reservedFor')) {
            $payload['reserved_for'] = $request->input('reservedFor');
        }
        if ($request->has('reservationTime')) {
            $payload['reservation_time'] = $request->input('reservationTime');
        }

        if ($status === 'available') {
            $payload['current_order_id'] = null;
            $payload['reserved_for'] = null;
            $payload['reservation_time'] = null;
            $payload['reservation_date'] = null;
        }

        $table->update($payload);

        return response()->json($table->fresh()->to_dict());
    }

    /**
     * Delete table
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $table = $this->findTable($id);

        ShopHelper::requireShopAccess($table->shop_id, $user);

        $table->delete();

        return response()->json(['ok' => true, 'message' => 'Table deleted']);
    }

    /**
     * Reset to standard 18 tables
     */
    public function reset(Request $request)
    {
        $user = $request->user();
        $shopId = (int) $request->input('shop_id', $user?->shop_id);

        if (!$shopId) {
            throw new HttpException(400, 'shop_id is required');
        }

        ShopHelper::requireShopAccess($shopId, $user);

        RestaurantTable::where('shop_id', $shopId)->delete();
        $this->seedDefaultTables($shopId);

        $tables = RestaurantTable::where('shop_id', $shopId)->orderBy('table_number', 'asc')->get();

        return response()->json($tables->map(fn ($t) => $t->to_dict())->toArray());
    }

    protected function findTable($id): RestaurantTable
    {
        // Support finding by integer ID or by T-XX formatted code
        if (is_numeric($id)) {
            $table = RestaurantTable::find((int) $id);
        } else {
            $num = (int) preg_replace('/[^0-9]/', '', (string) $id);
            $table = RestaurantTable::where('table_number', $num)->first();
        }

        if (!$table) {
            throw new HttpException(404, 'Table not found');
        }

        return $table;
    }

    protected function seedDefaultTables(int $shopId): void
    {
        foreach (self::DEFAULT_TEMPLATE as $tpl) {
            RestaurantTable::create([
                'shop_id' => $shopId,
                'name' => "Table {$tpl['number']}",
                'table_number' => $tpl['number'],
                'seats' => $tpl['seats'],
                'section' => $tpl['section'],
                'status' => $tpl['status'],
                'shape' => 'square',
                'pos_x' => 0,
                'pos_y' => 0,
            ]);
        }
    }
}

