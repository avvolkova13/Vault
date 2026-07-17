import type { Product } from "../types/commerce";
import type { CoinTransaction, InventoryItem, MarketplaceOrder, OrderItemSnapshot, OrderStatus } from "../types/account";

type RecordOptions = {
  id?: string;
  transactionId?: string;
  number?: string;
  createdAt?: string;
  status?: OrderStatus;
};

let recordSequence = 0;

function createRecordId(prefix: string, createdAt: string) {
  recordSequence += 1;
  return `${prefix}-${Date.parse(createdAt).toString(36)}-${recordSequence.toString(36)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isOrderItem(value: unknown): value is OrderItemSnapshot {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.productId === "string" &&
    typeof value.slug === "string" &&
    typeof value.title === "string" &&
    (value.kind === "skins" || value.kind === "steam" || value.kind === "gpt") &&
    typeof value.priceCoins === "number" &&
    Number.isFinite(value.priceCoins) &&
    value.priceCoins >= 0 &&
    (value.fulfillmentMode === "automatic" || value.fulfillmentMode === "steam-trade" || value.fulfillmentMode === "manual") &&
    (value.deliveryStatus === "delivered" || value.deliveryStatus === "inventory-ready" || value.deliveryStatus === "pending") &&
    (value.image === undefined || typeof value.image === "string") &&
    (value.imageAlt === undefined || typeof value.imageAlt === "string")
  );
}

function isMarketplaceOrder(value: unknown): value is MarketplaceOrder {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.number === "string" &&
    isIsoDate(value.createdAt) &&
    Array.isArray(value.items) &&
    value.items.length > 0 &&
    value.items.every(isOrderItem) &&
    typeof value.totalCoins === "number" &&
    Number.isFinite(value.totalCoins) &&
    value.totalCoins >= 0 &&
    (value.status === "completed" || value.status === "processing" || value.status === "cancelled") &&
    typeof value.isDemo === "boolean"
  );
}

function isCoinTransaction(value: unknown): value is CoinTransaction {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    isIsoDate(value.createdAt) &&
    (value.direction === "credit" || value.direction === "debit") &&
    (value.reason === "top-up" || value.reason === "purchase") &&
    typeof value.amountCoins === "number" &&
    Number.isFinite(value.amountCoins) &&
    value.amountCoins > 0 &&
    typeof value.balanceAfterCoins === "number" &&
    Number.isFinite(value.balanceAfterCoins) &&
    value.balanceAfterCoins >= 0 &&
    (value.status === "completed" || value.status === "failed") &&
    (value.orderNumber === undefined || typeof value.orderNumber === "string") &&
    typeof value.description === "string" &&
    typeof value.isDemo === "boolean"
  );
}

export function createCheckoutRecords(products: Product[], balanceAfterCoins: number, options: RecordOptions = {}): { order: MarketplaceOrder; transaction: CoinTransaction } {
  if (!products.length) throw new Error("Checkout requires at least one product.");
  const createdAt = options.createdAt ?? new Date().toISOString();
  const status = options.status ?? "processing";
  const id = options.id ?? createRecordId("order", createdAt);
  const number = options.number ?? `VLT-${id.slice(-10).toUpperCase()}`;
  const items = products.map<OrderItemSnapshot>((product, index) => ({
    id: `${id}-item-${index + 1}`,
    productId: product.id,
    slug: product.slug,
    title: product.title,
    kind: product.kind,
    priceCoins: product.priceCoins,
    fulfillmentMode: product.fulfillmentMode,
    deliveryStatus:
      status === "completed"
        ? product.kind === "skins" ? "inventory-ready" : "delivered"
        : "pending",
    image: product.image,
    imageAlt: product.imageAlt,
  }));
  const totalCoins = items.reduce((total, item) => total + item.priceCoins, 0);
  const order: MarketplaceOrder = {
    id,
    number,
    createdAt,
    items,
    totalCoins,
    status,
    isDemo: true,
  };
  const transaction: CoinTransaction = {
    id: options.transactionId ?? createRecordId("transaction", createdAt),
    createdAt,
    direction: "debit",
    reason: "purchase",
    amountCoins: totalCoins,
    balanceAfterCoins: Math.max(0, Math.floor(balanceAfterCoins)),
    status: "completed",
    orderNumber: number,
    description: `Покупка: ${items.map((item) => item.title).join(", ")}`,
    isDemo: true,
  };
  return { order, transaction };
}

export function createTopUpTransaction(amountCoins: number, balanceAfterCoins: number, options: Pick<RecordOptions, "id" | "createdAt"> = {}): CoinTransaction {
  const safeAmount = Math.floor(amountCoins);
  if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
    throw new Error("Top-up amount must be positive.");
  }
  const createdAt = options.createdAt ?? new Date().toISOString();
  return {
    id: options.id ?? createRecordId("top-up", createdAt),
    createdAt,
    direction: "credit",
    reason: "top-up",
    amountCoins: safeAmount,
    balanceAfterCoins: Math.max(0, Math.floor(balanceAfterCoins)),
    status: "completed",
    description: "Пополнение баланса Coins",
    isDemo: true,
  };
}

export function normalizeOrders(value: unknown): MarketplaceOrder[] {
  return Array.isArray(value) ? value.filter(isMarketplaceOrder) : [];
}

export function normalizeTransactions(value: unknown): CoinTransaction[] {
  return Array.isArray(value) ? value.filter(isCoinTransaction) : [];
}

export function sortOrdersNewestFirst(orders: MarketplaceOrder[]) {
  return [...orders].sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt));
}

export function getInventoryItems(orders: MarketplaceOrder[]): InventoryItem[] {
  return sortOrdersNewestFirst(orders).flatMap((order) =>
    order.status === "completed"
      ? order.items
          .filter((item) => item.kind === "skins" && item.deliveryStatus === "inventory-ready")
          .map((item) => ({
            ...item,
            orderId: order.id,
            orderNumber: order.number,
            acquiredAt: order.createdAt,
          }))
      : [],
  );
}

export function getInventoryPreviewItems(orders: MarketplaceOrder[]): OrderItemSnapshot[] {
  return getInventoryItems(orders);
}

export function validateSteamTradeUrl(value: string) {
  const normalized = value.trim();
  if (!normalized) return "Укажите Steam Trade URL.";

  let url: URL;
  try {
    url = new URL(normalized);
  } catch {
    return "Проверьте формат Steam Trade URL.";
  }

  if (url.protocol !== "https:") return "Steam Trade URL должен начинаться с https://.";
  if (url.hostname !== "steamcommunity.com") return "Используйте ссылку с домена steamcommunity.com.";
  if (url.pathname !== "/tradeoffer/new/") return "Проверьте формат Steam Trade URL.";
  if (!/^\d+$/.test(url.searchParams.get("partner") ?? "")) return "В Steam Trade URL отсутствует корректный partner.";
  if (!/^[A-Za-z0-9_-]{6,}$/.test(url.searchParams.get("token") ?? "")) return "В Steam Trade URL отсутствует корректный token.";
  return "";
}

export function normalizeSteamTradeUrl(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return validateSteamTradeUrl(normalized) ? "" : normalized;
}
