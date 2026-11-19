<?php

namespace App\Services\CoreApi;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class CoreApiService
{
    protected string $baseUrl;
    protected string $serviceKey;
    protected int $timeout;
    protected int $retries;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('core-api.base_url', 'http://localhost:8003'), '/');
        $this->serviceKey = (string) config('core-api.service_key', '');
        $this->timeout = (int) config('core-api.timeout', 20);
        $this->retries = (int) config('core-api.retry_attempts', 3);
    }

    /**
     * Build base HTTP client request with common headers.
     */
    protected function client()
    {
        $req = Http::timeout($this->timeout)
            ->retry($this->retries, 200, throw: false)
            ->acceptJson();

        if (!empty($this->serviceKey)) {
            $req = $req->withHeaders([
                'X-Bot-Service-Key' => $this->serviceKey,
            ]);
        }

        return $req;
    }

    /**
     * Fetch shop details by username or ID.
     */
    public function getShop(string|int $shopIdentifier): ?array
    {
        try {
            $url = is_numeric($shopIdentifier)
                ? "{$this->baseUrl}/api/shops/public/{$shopIdentifier}"
                : "{$this->baseUrl}/api/shops/{$shopIdentifier}";

            $response = $this->client()->get($url);

            if ($response->successful()) {
                return $response->json();
            }

            Log::warning("CoreApiService::getShop failed for {$shopIdentifier}: {$response->status()}");
            return null;
        } catch (Throwable $e) {
            Log::error("CoreApiService::getShop error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Fetch public products for a specific shop.
     */
    public function getProducts(?int $shopId = null, int $limit = 10): array
    {
        try {
            $query = ['per_page' => $limit];
            if ($shopId) {
                $query['shop_id'] = $shopId;
            }

            $response = $this->client()->get("{$this->baseUrl}/api/products/public", $query);

            if ($response->successful()) {
                $data = $response->json();
                return $data['data'] ?? $data['items'] ?? (is_array($data) ? $data : []);
            }

            return [];
        } catch (Throwable $e) {
            Log::error("CoreApiService::getProducts error: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Track an order by order number.
     */
    public function trackOrder(string $orderNumber): ?array
    {
        try {
            $cleanNumber = trim($orderNumber);
            $response = $this->client()->get("{$this->baseUrl}/api/orders/public/track", [
                'order_number' => $cleanNumber,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            return null;
        } catch (Throwable $e) {
            Log::error("CoreApiService::trackOrder error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Link Telegram chat to a shop using Profile ID and Secret Key / Linking Token.
     */
    public function linkPaymentChat(string $profileId, string $secretKey, string|int $chatId, array $userMeta = []): array
    {
        try {
            // First attempt: /api/bot-service/link
            $resp = $this->client()->post("{$this->baseUrl}/api/bot-service/link", [
                'profile_id' => $profileId,
                'secret_key' => $secretKey,
                'chat_id' => (string) $chatId,
                'user_info' => $userMeta,
            ]);

            if ($resp->successful()) {
                return $resp->json();
            }

            // Fallback: /api/telegram/link-chat
            $fallback = $this->client()->post("{$this->baseUrl}/api/telegram/link-chat", [
                'profile_id' => $profileId,
                'secret_key' => $secretKey,
                'chat_id' => (string) $chatId,
            ]);

            if ($fallback->successful()) {
                return $fallback->json();
            }

            return [
                'ok' => false,
                'detail' => $resp->json('detail') ?? $fallback->json('detail') ?? 'Profile ID ឬ Secret Key មិនត្រឹមត្រូវទេ។',
            ];
        } catch (Throwable $e) {
            Log::error("CoreApiService::linkPaymentChat error: " . $e->getMessage());
            return [
                'ok' => false,
                'detail' => 'មិនអាចភ្ជាប់ទៅកាន់ Core API បានទេ៖ ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Fetch Sales Report on demand from Core API.
     */
    public function getSalesReport(int|string $shopId, string $period, string|int $chatId): ?array
    {
        try {
            $resp = $this->client()->get("{$this->baseUrl}/api/bot-service/report", [
                'shop_id' => $shopId,
                'period' => $period,
                'chat_id' => (string) $chatId,
            ]);

            if ($resp->successful()) {
                return $resp->json('report');
            }

            Log::warning("CoreApiService::getSalesReport failed for shop {$shopId}: {$resp->status()}");
            return null;
        } catch (Throwable $e) {
            Log::error("CoreApiService::getSalesReport error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Fetch all connected shop bots from Core API config endpoint.
     */
    public function getConnectedShops(): array
    {
        try {
            $resp = $this->client()->get("{$this->baseUrl}/api/bot-service/config");
            if ($resp->successful()) {
                $data = $resp->json();
                return $data['shops'] ?? [];
            }
        } catch (Throwable $e) {
            Log::warning("CoreApiService::getConnectedShops (/api/bot-service/config) unavailable: " . $e->getMessage());
        }

        return [];
    }
}
