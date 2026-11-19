import api from '../api/client';

export interface TelegramNotificationPreferences {
  daily_report_enabled?: boolean;
  weekly_report_enabled?: boolean;
  monthly_report_enabled?: boolean;
  order_alerts_enabled?: boolean;
  payment_alerts_enabled?: boolean;
  stock_alerts_enabled?: boolean;
}

export interface LinkedAccount {
  chat_id: string;
  masked_chat_id: string;
  telegram_user_id?: string | number | null;
  username?: string | null;
  first_name?: string | null;
  linked_at?: string | null;
}

export const telegramService = {
  test: (data: any) =>
    api.post('/api/telegram/test', data).then((r) => r.data),
  testTelegram: (data: any) =>
    api.post('/api/telegram/test', data).then((r) => r.data),
  getSettings: (shopId: number | string) =>
    api.get('/api/telegram/settings', { params: { shop_id: shopId } }).then((r) => r.data),
  getTelegramSettings: (shopId: number | string) =>
    api.get('/api/telegram/settings', { params: { shop_id: shopId } }).then((r) => r.data),
  setWebhook: (shopId: number | string) =>
    api.post('/api/telegram/setwebhook', { shop_id: shopId }, { params: { shop_id: shopId } }).then((r) => r.data),
  setTelegramWebhook: (shopId: number | string) =>
    api.post('/api/telegram/setwebhook', { shop_id: shopId }, { params: { shop_id: shopId } }).then((r) => r.data),
  unlinkChat: (data: { shop_id: number | string; chat_id: string | number }) =>
    api.post('/api/telegram/unlink-chat', data).then((r) => r.data),
  disconnectAccount: (shopId: number | string, chatId: string | number) =>
    api.post('/api/telegram/disconnect', { shop_id: shopId, chat_id: chatId }).then((r) => r.data),
  generateLinkingToken: (shopId: number | string) =>
    api.post('/api/telegram/linking-token', { shop_id: shopId }).then((r) => r.data),
  updatePreferences: (shopId: number | string, preferences: TelegramNotificationPreferences) =>
    api.put('/api/telegram/preferences', { shop_id: shopId, preferences }).then((r) => r.data),
  sendStockAlert: (shopId: number | string) =>
    api.post('/api/telegram/stock-alert', { shop_id: shopId }).then((r) => r.data),
};

export default telegramService;
