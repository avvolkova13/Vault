import type { Metadata } from "next";

import { CartScreen } from "@/features/cart/CartScreen";

export const metadata: Metadata = {
  title: "Корзина — Vault",
  description: "Проверьте цифровые товары и баланс Coins перед оформлением заказа.",
};

type CartPageProps = {
  searchParams: Promise<{ topUp?: string | string[] }>;
};

export default async function CartPage({ searchParams }: CartPageProps) {
  const params = await searchParams;
  const topUp = Array.isArray(params.topUp) ? params.topUp[0] : params.topUp;
  return <CartScreen showTopUpNotice={topUp === "success"} />;
}
