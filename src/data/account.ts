import { catalogProducts } from "./products";
import { createCheckoutRecords, createTopUpTransaction } from "../lib/account";

function product(id: string) {
  const result = catalogProducts.find((item) => item.id === id);
  if (!result) throw new Error(`Unknown demo product: ${id}`);
  return result;
}

const steamOrder = createCheckoutRecords([product("steam-top-up-1000")], 10_500, {
  id: "demo-order-steam",
  transactionId: "demo-transaction-steam",
  number: "VLT-260705-1842",
  createdAt: "2026-07-05T12:42:00.000Z",
  status: "completed",
});

const skinOrder = createCheckoutRecords([product("ak-redline")], 7_660, {
  id: "demo-order-skin",
  transactionId: "demo-transaction-skin",
  number: "VLT-260712-4178",
  createdAt: "2026-07-12T08:18:00.000Z",
  status: "completed",
});

const gptOrder = createCheckoutRecords([product("gpt-plus")], 3_460, {
  id: "demo-order-gpt",
  transactionId: "demo-transaction-gpt",
  number: "VLT-260714-6391",
  createdAt: "2026-07-14T15:06:00.000Z",
  status: "processing",
});

export const demoOrders = [gptOrder.order, skinOrder.order, steamOrder.order];

export const demoTransactions = [
  gptOrder.transaction,
  skinOrder.transaction,
  steamOrder.transaction,
  createTopUpTransaction(12_000, 12_000, {
    id: "demo-transaction-top-up",
    createdAt: "2026-07-01T09:30:00.000Z",
  }),
];
