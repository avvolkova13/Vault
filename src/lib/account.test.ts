import assert from "node:assert/strict";
import test from "node:test";

import { catalogProducts } from "../data/products.ts";
import {
  createCheckoutRecords,
  createTopUpTransaction,
  getInventoryItems,
  getInventoryPreviewItems,
  normalizeOrders,
  normalizeSteamTradeUrl,
  normalizeTransactions,
  sortOrdersNewestFirst,
  validateSteamTradeUrl,
} from "./account.ts";

function getCatalogProduct(id: string) {
  const product = catalogProducts.find((item) => item.id === id);
  assert.ok(product, `Товар ${id} должен существовать`);
  return product;
}

test("checkout создаёт snapshot всех товаров и согласованное списание Coins", () => {
  const products = [getCatalogProduct("ak-redline"), getCatalogProduct("gpt-plus")];
  const result = createCheckoutRecords(products, 1_960, {
    id: "order-test",
    number: "VLT-TEST-001",
    createdAt: "2026-07-16T08:00:00.000Z",
  });

  assert.equal(result.order.items.length, 2);
  assert.equal(result.order.totalCoins, 7_040);
  assert.deepEqual(result.order.items.map((item) => item.title), ["AK-47 | Redline", "GPT Plus"]);
  assert.equal(result.transaction.direction, "debit");
  assert.equal(result.transaction.amountCoins, 7_040);
  assert.equal(result.transaction.balanceAfterCoins, 1_960);
  assert.equal(result.transaction.orderNumber, "VLT-TEST-001");
});

test("пополнение создаёт только положительную завершённую операцию", () => {
  const transaction = createTopUpTransaction(2_500, 5_340, {
    id: "top-up-test",
    createdAt: "2026-07-16T08:05:00.000Z",
  });

  assert.equal(transaction.direction, "credit");
  assert.equal(transaction.reason, "top-up");
  assert.equal(transaction.amountCoins, 2_500);
  assert.equal(transaction.balanceAfterCoins, 5_340);
  assert.throws(() => createTopUpTransaction(0, 5_340));
});

test("нормализация истории отбрасывает повреждённые записи", () => {
  const valid = createCheckoutRecords([getCatalogProduct("ak-redline")], 0, {
    id: "order-valid",
    number: "VLT-VALID",
    createdAt: "2026-07-16T08:10:00.000Z",
  });

  assert.deepEqual(normalizeOrders([valid.order, { id: 1 }, null]), [valid.order]);
  assert.deepEqual(normalizeTransactions([valid.transaction, { amountCoins: -1 }]), [valid.transaction]);
  assert.deepEqual(normalizeOrders("broken"), []);
  assert.deepEqual(normalizeTransactions(null), []);
});

test("заказы сортируются по дате без изменения исходного массива", () => {
  const older = createCheckoutRecords([getCatalogProduct("steam-top-up-500")], 0, {
    id: "older",
    number: "VLT-OLDER",
    createdAt: "2026-07-10T08:00:00.000Z",
  }).order;
  const newer = createCheckoutRecords([getCatalogProduct("gpt-plus")], 0, {
    id: "newer",
    number: "VLT-NEWER",
    createdAt: "2026-07-15T08:00:00.000Z",
  }).order;
  const source = [older, newer];

  assert.deepEqual(sortOrdersNewestFirst(source).map((order) => order.id), ["newer", "older"]);
  assert.deepEqual(source.map((order) => order.id), ["older", "newer"]);
});

test("preview инвентаря содержит только завершённые игровые предметы", () => {
  const ready = createCheckoutRecords([getCatalogProduct("ak-redline")], 0, {
    id: "ready",
    number: "VLT-READY",
    createdAt: "2026-07-15T08:00:00.000Z",
    status: "completed",
  }).order;
  const digital = createCheckoutRecords([getCatalogProduct("gpt-plus")], 0, {
    id: "digital",
    number: "VLT-DIGITAL",
    createdAt: "2026-07-15T09:00:00.000Z",
    status: "completed",
  }).order;
  const pending = createCheckoutRecords([getCatalogProduct("awp-asiimov")], 0, {
    id: "pending",
    number: "VLT-PENDING",
    createdAt: "2026-07-15T10:00:00.000Z",
  }).order;

  assert.deepEqual(getInventoryPreviewItems([ready, digital, pending]).map((item) => item.productId), ["ak-redline"]);
});

test("полный инвентарь сохраняет заказ, дату и повторные покупки одного товара", () => {
  const first = createCheckoutRecords([getCatalogProduct("ak-redline")], 0, {
    id: "inventory-first",
    number: "VLT-INVENTORY-1",
    createdAt: "2026-07-12T08:00:00.000Z",
    status: "completed",
  }).order;
  const second = createCheckoutRecords([getCatalogProduct("ak-redline")], 0, {
    id: "inventory-second",
    number: "VLT-INVENTORY-2",
    createdAt: "2026-07-15T08:00:00.000Z",
    status: "completed",
  }).order;

  const items = getInventoryItems([first, second]);
  assert.equal(items.length, 2);
  assert.deepEqual(items.map((item) => item.orderNumber), ["VLT-INVENTORY-2", "VLT-INVENTORY-1"]);
  assert.equal(items[0].orderId, "inventory-second");
  assert.equal(items[0].acquiredAt, "2026-07-15T08:00:00.000Z");
  assert.equal(items[0].productId, items[1].productId);
  assert.notEqual(items[0].id, items[1].id);
});

test("Steam Trade URL принимает только официальный tradeoffer URL", () => {
  assert.equal(validateSteamTradeUrl(""), "Укажите Steam Trade URL.");
  assert.equal(
    validateSteamTradeUrl("https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=AbC_12-x"),
    "",
  );
  assert.match(validateSteamTradeUrl("http://steamcommunity.com/tradeoffer/new/?partner=1&token=abcdef"), /https/);
  assert.match(validateSteamTradeUrl("https://example.com/tradeoffer/new/?partner=1&token=abcdef"), /steamcommunity\.com/);
  assert.match(validateSteamTradeUrl("https://steamcommunity.com/id/user"), /формат/);
});

test("повреждённый Trade URL из localStorage сбрасывается", () => {
  const valid = "https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=AbC_12-x";
  assert.equal(normalizeSteamTradeUrl(valid), valid);
  assert.equal(normalizeSteamTradeUrl("https://example.com/tradeoffer/new/?partner=1&token=abcdef"), "");
  assert.equal(normalizeSteamTradeUrl(42), "");
});
