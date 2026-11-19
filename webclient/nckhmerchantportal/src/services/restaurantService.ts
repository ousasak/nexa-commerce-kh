import api from '../api/client';
import { RestaurantTable, Reservation, KitchenOrder, TableStatus, KitchenOrderStatus } from '../types/restaurant';
import { useAuthStore } from '../stores/auth.store';

function resolveShopId(shopId?: number | string): number | string {
  if (shopId) return shopId;
  const authUser = useAuthStore.getState().user;
  return authUser?.shop_id || 2;
}

function cleanIdParam(id: number | string): string | number {
  if (typeof id === 'number') return id;
  const digits = id.replace(/[^0-9]/g, '');
  return digits || id;
}

export const restaurantService = {
  // ==================== TABLES ====================
  getTables: async (
    shopId?: number | string,
    params?: { section?: string; status?: string }
  ): Promise<RestaurantTable[]> => {
    const sId = resolveShopId(shopId);
    const res = await api.get('/api/tables', {
      params: { shop_id: sId, ...params },
    });
    return res.data;
  },

  getTable: async (id: number | string): Promise<RestaurantTable> => {
    const res = await api.get(`/api/tables/${id}`);
    return res.data;
  },

  createTable: async (data: Partial<RestaurantTable> & { shop_id?: number | string }): Promise<RestaurantTable> => {
    const sId = resolveShopId(data.shop_id);
    const res = await api.post('/api/tables', {
      ...data,
      shop_id: sId,
    });
    return res.data;
  },

  updateTable: async (id: number | string, data: Partial<RestaurantTable>): Promise<RestaurantTable> => {
    const res = await api.put(`/api/tables/${id}`, data);
    return res.data;
  },

  updateTableStatus: async (
    id: number | string,
    status: TableStatus,
    extra?: Partial<RestaurantTable>
  ): Promise<RestaurantTable> => {
    const res = await api.patch(`/api/tables/${id}/status`, {
      status,
      ...extra,
    });
    return res.data;
  },

  deleteTable: async (id: number | string): Promise<{ ok: boolean }> => {
    const res = await api.delete(`/api/tables/${id}`);
    return res.data;
  },

  resetTables: async (shopId?: number | string): Promise<RestaurantTable[]> => {
    const sId = resolveShopId(shopId);
    const res = await api.post('/api/tables/reset', { shop_id: sId });
    return res.data;
  },

  // ==================== RESERVATIONS ====================
  getReservations: async (
    shopId?: number | string,
    params?: { date?: string; status?: string; search?: string }
  ): Promise<Reservation[]> => {
    const sId = resolveShopId(shopId);
    const res = await api.get('/api/reservations', {
      params: { shop_id: sId, ...params },
    });
    return res.data;
  },

  getReservation: async (id: number | string): Promise<Reservation> => {
    const cleanId = cleanIdParam(id);
    const res = await api.get(`/api/reservations/${cleanId}`);
    return res.data;
  },

  createReservation: async (data: Partial<Reservation> & { shop_id?: number | string }): Promise<Reservation> => {
    const sId = resolveShopId(data.shop_id);
    const res = await api.post('/api/reservations', {
      ...data,
      shop_id: sId,
    });
    return res.data;
  },

  updateReservation: async (id: number | string, data: Partial<Reservation>): Promise<Reservation> => {
    const cleanId = cleanIdParam(id);
    const res = await api.put(`/api/reservations/${cleanId}`, data);
    return res.data;
  },

  updateReservationStatus: async (id: number | string, status: string): Promise<Reservation> => {
    const cleanId = cleanIdParam(id);
    const res = await api.patch(`/api/reservations/${cleanId}/status`, { status });
    return res.data;
  },

  deleteReservation: async (id: number | string): Promise<{ ok: boolean }> => {
    const cleanId = cleanIdParam(id);
    const res = await api.delete(`/api/reservations/${cleanId}`);
    return res.data;
  },

  // ==================== KITCHEN DISPLAY ====================
  getKitchenOrders: async (
    shopId?: number | string,
    params?: { date?: string }
  ): Promise<KitchenOrder[]> => {
    const sId = resolveShopId(shopId);
    const res = await api.get('/api/kitchen-orders', {
      params: { shop_id: sId, ...params },
    });
    return res.data;
  },

  createKitchenOrder: async (data: any): Promise<any> => {
    const sId = resolveShopId(data.shop_id);
    const res = await api.post('/api/kitchen-orders', {
      ...data,
      shop_id: sId,
    });
    return res.data;
  },

  updateKitchenOrderStatus: async (
    orderId: number | string,
    status: KitchenOrderStatus
  ): Promise<any> => {
    const cleanId = cleanIdParam(orderId);
    const res = await api.patch(`/api/kitchen-orders/${cleanId}/status`, { status });
    return res.data;
  },
};

export default restaurantService;

