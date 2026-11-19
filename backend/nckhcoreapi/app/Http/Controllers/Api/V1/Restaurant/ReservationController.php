<?php

namespace App\Http\Controllers\Api\V1\Restaurant;

use App\Helpers\ShopHelper;
use App\Http\Controllers\Controller;
use App\Models\Reservation;
use App\Models\RestaurantTable;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpException;

class ReservationController extends Controller
{
    /**
     * Sample demo reservations
     */
    const SAMPLE_RESERVATIONS = [
        [
            'guest_name' => 'Emily Ashford',
            'phone' => '+1 (555) 234-5678',
            'reservation_date' => '2026-10-03',
            'reservation_time' => '12:30',
            'party_size' => 2,
            'table_number_display' => 'Table 2',
            'table_number' => 2,
            'duration_minutes' => 90,
            'status' => 'upcoming',
            'notes' => 'Window side requested',
        ],
        [
            'guest_name' => 'George Pemberton',
            'phone' => '+1 (555) 876-5432',
            'reservation_date' => '2026-10-03',
            'reservation_time' => '19:00',
            'party_size' => 12,
            'table_number_display' => 'Table 12',
            'table_number' => 12,
            'duration_minutes' => 120,
            'status' => 'upcoming',
            'notes' => 'Family gathering, pre-ordered dessert',
        ],
        [
            'guest_name' => 'James Hartley',
            'phone' => '+44 7700 900001',
            'reservation_date' => '2026-10-02',
            'reservation_time' => '13:00',
            'party_size' => 4,
            'table_number_display' => 'Table 5',
            'table_number' => 5,
            'duration_minutes' => 90,
            'status' => 'seated',
            'notes' => 'Anniversary dinner — please arrange flowers on table',
        ],
        [
            'guest_name' => 'Bennett Family',
            'phone' => '+44 7700 900002',
            'reservation_date' => '2026-10-02',
            'reservation_time' => '19:30',
            'party_size' => 4,
            'table_number_display' => 'Table 4',
            'table_number' => 4,
            'duration_minutes' => 90,
            'status' => 'upcoming',
            'notes' => 'High chair needed for toddler',
        ],
        [
            'guest_name' => 'Hartley Birthday',
            'phone' => '+44 7700 900003',
            'reservation_date' => '2026-10-02',
            'reservation_time' => '20:00',
            'party_size' => 8,
            'table_number_display' => 'Table 11',
            'table_number' => 11,
            'duration_minutes' => 150,
            'status' => 'upcoming',
            'notes' => 'Birthday celebration — arrange cake and decorations',
        ],
        [
            'guest_name' => 'William Thornton',
            'phone' => '+44 7700 900004',
            'reservation_date' => '2026-10-02',
            'reservation_time' => '20:30',
            'party_size' => 6,
            'table_number_display' => 'Table 8',
            'table_number' => 8,
            'duration_minutes' => 120,
            'status' => 'upcoming',
            'notes' => 'Pre-ordered chef tasting menu',
        ],
    ];

    /**
     * List all reservations for a shop
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $shopId = (int) $request->input('shop_id', $user?->shop_id);

        if (!$shopId) {
            throw new HttpException(400, 'shop_id is required');
        }

        ShopHelper::requireShopAccess($shopId, $user);

        // Auto-seed if 0 reservations
        if (Reservation::where('shop_id', $shopId)->count() === 0) {
            $this->seedSampleReservations($shopId);
        }

        $query = Reservation::with('table')->where('shop_id', $shopId);

        if ($request->filled('date') && $request->input('date') !== 'all') {
            $query->where('reservation_date', $request->input('date'));
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('search')) {
            $s = trim((string) $request->input('search'));
            $query->where(function ($q) use ($s) {
                $q->where('guest_name', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%")
                    ->orWhere('table_number_display', 'like', "%{$s}%");
            });
        }

        $reservations = $query->orderBy('reservation_date', 'desc')
            ->orderBy('reservation_time', 'asc')
            ->get();

        return response()->json($reservations->map(fn ($r) => $r->to_dict())->toArray());
    }

    /**
     * Create a new reservation
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $shopId = (int) $request->input('shop_id', $user?->shop_id);

        if (!$shopId) {
            throw new HttpException(400, 'shop_id is required');
        }

        ShopHelper::requireShopAccess($shopId, $user);

        $guestName = trim((string) $request->input('guestName', $request->input('guest_name', '')));
        if (empty($guestName)) {
            throw new HttpException(400, 'Guest name is required');
        }

        $phone = trim((string) $request->input('phone', ''));
        if (empty($phone)) {
            throw new HttpException(400, 'Phone number is required');
        }

        $date = trim((string) $request->input('date', $request->input('reservation_date', date('Y-m-d'))));
        $time = trim((string) $request->input('time', $request->input('reservation_time', '19:00')));
        $partySize = (int) $request->input('partySize', $request->input('party_size', 2));
        $duration = (int) $request->input('durationMinutes', $request->input('duration_minutes', 90));
        $status = trim((string) $request->input('status', 'upcoming'));
        $notes = trim((string) $request->input('notes', ''));

        // Handle table matching
        $rawTableId = $request->input('tableId', $request->input('table_id'));
        $tableDbId = null;
        $tableDisplay = $rawTableId ? (string) $rawTableId : null;

        if ($rawTableId) {
            $num = (int) preg_replace('/[^0-9]/', '', (string) $rawTableId);
            if ($num > 0) {
                $tObj = RestaurantTable::where('shop_id', $shopId)->where('table_number', $num)->first();
                if ($tObj) {
                    $tableDbId = $tObj->id;
                    $tableDisplay = "Table {$num}";

                    // Reflect status on table if upcoming/seated
                    if ($status === 'upcoming') {
                        $tObj->update([
                            'status' => 'reserved',
                            'reserved_for' => $guestName,
                            'reservation_time' => $time,
                            'reservation_date' => $date,
                        ]);
                    } elseif ($status === 'seated') {
                        $tObj->update([
                            'status' => 'occupied',
                            'reserved_for' => null,
                            'reservation_time' => null,
                        ]);
                    }
                }
            }
        }

        $res = Reservation::create([
            'shop_id' => $shopId,
            'table_id' => $tableDbId,
            'table_number_display' => $tableDisplay,
            'guest_name' => $guestName,
            'phone' => $phone,
            'email' => $request->input('email'),
            'reservation_date' => $date,
            'reservation_time' => $time,
            'party_size' => $partySize,
            'duration_minutes' => $duration,
            'status' => $status,
            'notes' => $notes,
        ]);

        return response()->json($res->fresh()->to_dict(), 201);
    }

    /**
     * Get reservation detail
     */
    public function show(Request $request, int $id)
    {
        $user = $request->user();
        $res = Reservation::with('table')->find($id);

        if (!$res) {
            throw new HttpException(404, 'Reservation not found');
        }

        ShopHelper::requireShopAccess($res->shop_id, $user);

        return response()->json($res->to_dict());
    }

    /**
     * Update reservation
     */
    public function update(Request $request, int $id)
    {
        $user = $request->user();
        $res = Reservation::with('table')->find($id);

        if (!$res) {
            throw new HttpException(404, 'Reservation not found');
        }

        ShopHelper::requireShopAccess($res->shop_id, $user);

        $payload = [];
        if ($request->has('guestName') || $request->has('guest_name')) {
            $payload['guest_name'] = trim((string) $request->input('guestName', $request->input('guest_name')));
        }
        if ($request->has('phone')) $payload['phone'] = trim((string) $request->input('phone'));
        if ($request->has('email')) $payload['email'] = trim((string) $request->input('email'));
        if ($request->has('date') || $request->has('reservation_date')) {
            $payload['reservation_date'] = trim((string) $request->input('date', $request->input('reservation_date')));
        }
        if ($request->has('time') || $request->has('reservation_time')) {
            $payload['reservation_time'] = trim((string) $request->input('time', $request->input('reservation_time')));
        }
        if ($request->has('partySize') || $request->has('party_size')) {
            $payload['party_size'] = (int) $request->input('partySize', $request->input('party_size'));
        }
        if ($request->has('durationMinutes') || $request->has('duration_minutes')) {
            $payload['duration_minutes'] = (int) $request->input('durationMinutes', $request->input('duration_minutes'));
        }
        if ($request->has('status')) {
            $payload['status'] = trim((string) $request->input('status'));
        }
        if ($request->has('notes')) $payload['notes'] = trim((string) $request->input('notes'));

        // Handle table changes
        if ($request->has('tableId') || $request->has('table_id')) {
            $rawTableId = $request->input('tableId', $request->input('table_id'));
            $num = (int) preg_replace('/[^0-9]/', '', (string) $rawTableId);
            if ($num > 0) {
                $tObj = RestaurantTable::where('shop_id', $res->shop_id)->where('table_number', $num)->first();
                if ($tObj) {
                    $payload['table_id'] = $tObj->id;
                    $payload['table_number_display'] = "Table {$num}";
                }
            } else {
                $payload['table_id'] = null;
                $payload['table_number_display'] = (string) $rawTableId;
            }
        }

        $res->update($payload);

        // Synchronize table status
        $this->syncTableWithReservation($res->fresh());

        return response()->json($res->fresh()->to_dict());
    }

    /**
     * Fast status patch
     */
    public function updateStatus(Request $request, int $id)
    {
        $user = $request->user();
        $res = Reservation::find($id);

        if (!$res) {
            throw new HttpException(404, 'Reservation not found');
        }

        ShopHelper::requireShopAccess($res->shop_id, $user);

        $status = trim((string) $request->input('status', 'upcoming'));
        $res->update(['status' => $status]);

        $this->syncTableWithReservation($res->fresh());

        return response()->json($res->fresh()->to_dict());
    }

    /**
     * Delete reservation
     */
    public function destroy(Request $request, int $id)
    {
        $user = $request->user();
        $res = Reservation::find($id);

        if (!$res) {
            throw new HttpException(404, 'Reservation not found');
        }

        ShopHelper::requireShopAccess($res->shop_id, $user);

        // Free up table if table was reserved for this guest
        if ($res->table_id) {
            $table = RestaurantTable::find($res->table_id);
            if ($table && $table->status === 'reserved') {
                $table->update([
                    'status' => 'available',
                    'reserved_for' => null,
                    'reservation_time' => null,
                    'reservation_date' => null,
                ]);
            }
        }

        $res->delete();

        return response()->json(['ok' => true, 'message' => 'Reservation deleted']);
    }

    protected function syncTableWithReservation(Reservation $res): void
    {
        if (!$res->table_id) return;
        $table = RestaurantTable::find($res->table_id);
        if (!$table) return;

        if ($res->status === 'seated') {
            $table->update([
                'status' => 'occupied',
                'reserved_for' => null,
                'reservation_time' => null,
            ]);
        } elseif ($res->status === 'upcoming') {
            $table->update([
                'status' => 'reserved',
                'reserved_for' => $res->guest_name,
                'reservation_time' => $res->reservation_time,
                'reservation_date' => $res->reservation_date,
            ]);
        } elseif (in_array($res->status, ['completed', 'cancelled'])) {
            if ($table->status === 'reserved' || $table->status === 'occupied') {
                $table->update([
                    'status' => 'available',
                    'reserved_for' => null,
                    'reservation_time' => null,
                    'reservation_date' => null,
                ]);
            }
        }
    }

    protected function seedSampleReservations(int $shopId): void
    {
        foreach (self::SAMPLE_RESERVATIONS as $sample) {
            $tableId = null;
            if (!empty($sample['table_number'])) {
                $tObj = RestaurantTable::where('shop_id', $shopId)->where('table_number', $sample['table_number'])->first();
                $tableId = $tObj?->id;
            }

            Reservation::create([
                'shop_id' => $shopId,
                'table_id' => $tableId,
                'table_number_display' => $sample['table_number_display'],
                'guest_name' => $sample['guest_name'],
                'phone' => $sample['phone'],
                'reservation_date' => $sample['reservation_date'],
                'reservation_time' => $sample['reservation_time'],
                'party_size' => $sample['party_size'],
                'duration_minutes' => $sample['duration_minutes'],
                'status' => $sample['status'],
                'notes' => $sample['notes'],
            ]);
        }
    }
}

