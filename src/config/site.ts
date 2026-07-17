import type { CoinConfig } from "@/types/commerce";

export const siteConfig = {
  name: "Vault",
  description: "Маркетплейс Steam, игровых предметов и цифровых товаров.",
  coin: {
    name: "Coins",
    rate: 1.5,
    fiat: "RUB",
  } satisfies CoinConfig,
  notice: "Все товары и операции оплачиваются в Coins. Для игровых предметов требуется Steam.",
  support: {
    email: "support@vault.market",
    hours: "Ежедневно, 10:00–22:00 (МСК)",
  },
  paymentMethods: [
    { name: "Visa", src: "/payments/visa.png", width: 58, height: 20 },
    { name: "Mastercard", src: "/payments/mastercard.png", width: 42, height: 26 },
    { name: "МИР", src: "/payments/mir.png", width: 50, height: 20 },
    { name: "СБП", src: "/payments/sbp.png", width: 46, height: 22 },
    { name: "Steam", src: "/payments/steam.png", width: 60, height: 20 },
  ] as const,
  valveDisclaimer:
    "Наш сайт не связан, не аффилирован и не одобрен Valve Corporation или Steam.",
} as const;
