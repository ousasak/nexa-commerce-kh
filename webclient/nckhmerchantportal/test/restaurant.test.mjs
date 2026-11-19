import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const SRC_ROOT = path.resolve('src');

describe('Restaurant Management (Floor Plan, Tables, Reservations, Kitchen Display)', () => {
  it('restaurantService exports all required API methods for tables, reservations, and KDS', () => {
    const servicePath = path.join(SRC_ROOT, 'services', 'restaurantService.ts');
    assert.ok(fs.existsSync(servicePath), 'restaurantService.ts exists');

    const content = fs.readFileSync(servicePath, 'utf8');
    const requiredMethods = [
      'getTables',
      'getTable',
      'createTable',
      'updateTable',
      'updateTableStatus',
      'deleteTable',
      'resetTables',
      'getReservations',
      'getReservation',
      'createReservation',
      'updateReservation',
      'updateReservationStatus',
      'deleteReservation',
      'getKitchenOrders',
      'createKitchenOrder',
      'updateKitchenOrderStatus',
    ];

    for (const m of requiredMethods) {
      assert.ok(
        content.includes(`${m}:`),
        `restaurantService should implement method ${m}`
      );
    }
  });

  it('restaurantStore exports useRestaurantStore with async loaders and optimistic actions', () => {
    const storePath = path.join(SRC_ROOT, 'stores', 'restaurantStore.ts');
    assert.ok(fs.existsSync(storePath), 'restaurantStore.ts exists');

    const content = fs.readFileSync(storePath, 'utf8');
    const expectedProperties = [
      'fetchTables',
      'fetchReservations',
      'fetchOrders',
      'fetchAll',
      'updateTableStatus',
      'addTable',
      'updateTable',
      'deleteTable',
      'resetTablesToDefaults',
      'updateOrderStatus',
      'addOrder',
      'addReservation',
      'updateReservation',
      'deleteReservation',
      'INITIAL_TABLES',
      'INITIAL_ORDERS',
      'INITIAL_RESERVATIONS',
    ];

    for (const prop of expectedProperties) {
      assert.ok(
        content.includes(prop),
        `restaurantStore should define or export ${prop}`
      );
    }
  });

  it('FloorPlanPage integrates live data without hardcoded date overrides', () => {
    const floorPlanPath = path.join(SRC_ROOT, 'features', 'floor-plan', 'FloorPlanPage.tsx');
    assert.ok(fs.existsSync(floorPlanPath), 'FloorPlanPage.tsx exists');

    const content = fs.readFileSync(floorPlanPath, 'utf8');

    // Make sure hardcoded '2026-10-03' conditional override is removed
    assert.ok(
      !content.includes("if (selectedDate === '2026-10-03')"),
      'Hardcoded date override should be removed from FloorPlanPage'
    );

    assert.ok(content.includes('fetchTables'), 'FloorPlanPage should invoke fetchTables');
    assert.ok(content.includes('fetchReservations'), 'FloorPlanPage should invoke fetchReservations');
    assert.ok(content.includes('RefreshCw'), 'FloorPlanPage should include a refresh icon button');
  });

  it('ReservationsPage fetches live reservations, uses RestroDatePickerPopover, DeleteConfirmDialog and ReservationDetailsModal', () => {
    const reservationsPath = path.join(SRC_ROOT, 'features', 'reservations', 'ReservationsPage.tsx');
    assert.ok(fs.existsSync(reservationsPath), 'ReservationsPage.tsx exists');

    const content = fs.readFileSync(reservationsPath, 'utf8');
    assert.ok(content.includes('fetchReservations'), 'ReservationsPage should call fetchReservations');
    assert.ok(content.includes('fetchTables'), 'ReservationsPage should call fetchTables');
    assert.ok(content.includes('RefreshCw'), 'ReservationsPage should have refresh button');
    assert.ok(content.includes('RestroDatePickerPopover'), 'ReservationsPage should use RestroDatePickerPopover');
    assert.ok(content.includes('DeleteConfirmDialog'), 'ReservationsPage should use DeleteConfirmDialog');
    assert.ok(content.includes('ReservationDetailsModal'), 'ReservationsPage should use ReservationDetailsModal');
    assert.ok(content.includes('ReservationRowActions'), 'ReservationsPage should use standardized ReservationRowActions');
    assert.ok(content.includes('statusLabels'), 'ReservationsPage should map localized statusLabels');
  });

  it('ReservationActions exports ReservationRowActions with standardized action menu and quick operations', () => {
    const actionsPath = path.join(SRC_ROOT, 'features', 'reservations', 'ReservationActions.tsx');
    assert.ok(fs.existsSync(actionsPath), 'ReservationActions.tsx exists');

    const content = fs.readFileSync(actionsPath, 'utf8');
    assert.ok(content.includes('ReservationRowActions'), 'Exports ReservationRowActions');
    assert.ok(content.includes('action-dropdown-container'), 'Uses action-dropdown-container class');
    assert.ok(content.includes('MoreHorizontal'), 'Uses MoreHorizontal icon');
    assert.ok(content.includes('onSeat'), 'Supports quick onSeat action');
    assert.ok(content.includes('onComplete'), 'Supports quick onComplete action');
    assert.ok(content.includes('Trash2'), 'Supports Delete action');
  });

  it('ReservationDetailsModal and EditReservationDrawer are fully localized with multi-language keys', () => {
    const detailsPath = path.join(SRC_ROOT, 'features', 'reservations', 'ReservationDetailsModal.tsx');
    const editPath = path.join(SRC_ROOT, 'features', 'reservations', 'EditReservationDrawer.tsx');
    const modalPath = path.join(SRC_ROOT, 'features', 'reservations', 'ReservationModal.tsx');

    assert.ok(fs.existsSync(detailsPath), 'ReservationDetailsModal.tsx exists');
    assert.ok(fs.existsSync(editPath), 'EditReservationDrawer.tsx exists');
    assert.ok(fs.existsSync(modalPath), 'ReservationModal.tsx exists');

    const detailsContent = fs.readFileSync(detailsPath, 'utf8');
    assert.ok(detailsContent.includes('useLanguage'), 'ReservationDetailsModal should use useLanguage');
    assert.ok(detailsContent.includes('statusLabels'), 'ReservationDetailsModal should localize statuses');

    const editContent = fs.readFileSync(editPath, 'utf8');
    assert.ok(editContent.includes('useLanguage'), 'EditReservationDrawer should use useLanguage');
    assert.ok(editContent.includes('statusLabels'), 'EditReservationDrawer should localize statuses');

    const modalContent = fs.readFileSync(modalPath, 'utf8');
    assert.ok(modalContent.includes('useLanguage'), 'ReservationModal should use useLanguage');
    assert.ok(modalContent.includes('statusLabels'), 'ReservationModal should localize statuses');
  });

  it('Both English and Khmer restaurant locale files exist, have symmetric keys, and non-empty translations', () => {
    const enPath = path.join(SRC_ROOT, 'locales', 'en', 'restaurant.json');
    const khPath = path.join(SRC_ROOT, 'locales', 'kh', 'restaurant.json');

    assert.ok(fs.existsSync(enPath), 'en/restaurant.json exists');
    assert.ok(fs.existsSync(khPath), 'kh/restaurant.json exists');

    const enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const khJson = JSON.parse(fs.readFileSync(khPath, 'utf8'));

    const criticalKeys = [
      'reservations',
      'newReservation',
      'editReservation',
      'allBookings',
      'totalBookings',
      'seatedUpcoming',
      'totalGuests',
      'allDates',
      'guests',
      'guestsUnit',
      'minutesUnit',
      'statusUpcoming',
      'statusSeated',
      'statusCompleted',
      'statusCancelled',
      'allStatuses',
      'guestName',
      'phone',
      'date',
      'time',
      'partySize',
      'table',
      'duration',
      'status',
      'actions',
      'saveChanges',
      'createReservation',
      'confirmReservation',
      'resDeleted',
      'confirmDeleteRes',
    ];

    for (const k of criticalKeys) {
      assert.ok(k in enJson, `en/restaurant.json missing key ${k}`);
      assert.ok(k in khJson, `kh/restaurant.json missing key ${k}`);
      assert.ok(typeof enJson[k] === 'string' && enJson[k].length > 0, `en/restaurant.json key ${k} must not be empty`);
      assert.ok(typeof khJson[k] === 'string' && khJson[k].length > 0, `kh/restaurant.json key ${k} must not be empty`);
    }

    // Check symmetry
    const enKeys = Object.keys(enJson).sort();
    const khKeys = Object.keys(khJson).sort();
    const missingInKh = enKeys.filter((k) => !(k in khJson));
    const missingInEn = khKeys.filter((k) => !(k in enJson));

    assert.deepEqual(missingInKh, [], 'All en keys must exist in kh/restaurant.json');
    assert.deepEqual(missingInEn, [], 'All kh keys must exist in en/restaurant.json');
  });

  it('KitchenDisplayPage fetches live orders with auto-polling and manual refresh', () => {
    const kdsPath = path.join(SRC_ROOT, 'features', 'kitchen-display', 'KitchenDisplayPage.tsx');
    assert.ok(fs.existsSync(kdsPath), 'KitchenDisplayPage.tsx exists');

    const content = fs.readFileSync(kdsPath, 'utf8');
    assert.ok(content.includes('fetchOrders'), 'KitchenDisplayPage should call fetchOrders');
    assert.ok(content.includes('setInterval'), 'KitchenDisplayPage should poll orders automatically');
    assert.ok(content.includes('updateOrderStatus'), 'KitchenDisplayPage should update order status');
    assert.ok(content.includes('handleStartPreparing'), 'KitchenDisplayPage should handle start preparing');
    assert.ok(content.includes('handleMarkReady'), 'KitchenDisplayPage should handle mark ready');
    assert.ok(content.includes('handleMarkServed'), 'KitchenDisplayPage should handle mark served');
    assert.ok(content.includes('draggable'), 'KitchenDisplayPage should support draggable cards');
    assert.ok(content.includes('handleDrop'), 'KitchenDisplayPage should handle drop events between columns');
  });

  it('KitchenDisplayPage implements all 6 world-class KDS usability recommendations', () => {
    const kdsPath = path.join(SRC_ROOT, 'features', 'kitchen-display', 'KitchenDisplayPage.tsx');
    assert.ok(fs.existsSync(kdsPath), 'KitchenDisplayPage.tsx exists');

    const content = fs.readFileSync(kdsPath, 'utf8');

    // 1. Color-Coded Urgency Timers
    assert.ok(content.includes('getUrgency'), 'Should define getUrgency classification helper');
    assert.ok(content.includes('urgentOverdue') || content.includes('LATE'), 'Should display LATE overdue indicator');
    assert.ok(content.includes('border-l-rose-500'), 'Should accent overdue orders in rose/red');
    assert.ok(content.includes('border-l-amber-500'), 'Should accent warning orders in amber/yellow');
    assert.ok(content.includes('border-l-emerald-400'), 'Should accent normal orders in emerald/green');

    // 2. Item-Level Tap Strike-Through
    assert.ok(content.includes('toggleItemComplete'), 'Should support toggleItemComplete on individual food items');
    assert.ok(content.includes('completedItems'), 'Should track completedItems state');
    assert.ok(content.includes('line-through'), 'Should visually strike through completed items');

    // 3. New Order Sound / Chime
    assert.ok(content.includes('playOrderChime'), 'Should synthesize order chime alert using Web Audio API');
    assert.ok(content.includes('soundEnabled'), 'Should track sound toggle state');
    assert.ok(content.includes('restro_kds_sound_v1'), 'Should sync sound setting with restro_kds_sound_v1 in storage');

    // Verify Sound Settings in Shop Settings
    const shopSettingsPath = path.join(SRC_ROOT, 'features', 'settings', 'ShopSettingsPage.tsx');
    assert.ok(fs.existsSync(shopSettingsPath), 'ShopSettingsPage.tsx exists');
    const settingsContent = fs.readFileSync(shopSettingsPath, 'utf8');
    assert.ok(settingsContent.includes('kdsSoundTitle'), 'ShopSettings should have kdsSoundTitle');
    assert.ok(settingsContent.includes('playTestChime'), 'ShopSettings should provide playTestChime sound test');

    // 4. Live Clock & Clean Header Toolbar
    assert.ok(content.includes('currentTime'), 'Should display live ticking clock');
    assert.ok(content.includes('border-l-rose-500') && content.includes('dark:!border-l-rose-500'), 'Should accent overdue orders with dark-mode visibility');

    // 5. Order Type & Search Filtering
    assert.ok(content.includes('typeFilter'), 'Should support typeFilter state');
    assert.ok(content.includes('typeCounts'), 'Should compute order counts per type tab');
    assert.ok(content.includes('searchQuery'), 'Should support real-time search filtering');

    // 6. Recall / Undo Support
    assert.ok(content.includes('handleRecallLast'), 'Should provide handleRecallLast for recent actions');
    assert.ok(content.includes('handleRecallServed'), 'Should provide handleRecallServed on served cards');
    assert.ok(content.includes('Undo2'), 'Should display Undo2 recall button');
  });
});
