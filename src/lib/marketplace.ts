export type ProductKind = "steam" | "skins" | "gpt";

export type SearchableProduct = {
  id: string;
  category: string;
  title: string;
  description: string;
  kind: ProductKind;
  keywords?: string[];
};

export type ProductFilter = "all" | ProductKind;
export type ConverterDirection = "rub-to-coins" | "coins-to-rub";

const relatedTerms: Record<ProductKind, string[]> = {
  steam: ["steam", "стим", "пополнение", "баланс", "кошелек"],
  skins: [
    "скин",
    "скины",
    "предмет",
    "предметы",
    "cs2",
    "dota",
  ],
  gpt: ["gpt", "chatgpt", "чат", "подписка", "сервис"],
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("ru-RU");
}

export function searchProducts<T extends SearchableProduct>(products: T[], query: string) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return products;
  }

  return products.filter((product) => {
    const haystack = [
      product.title,
      product.description,
      product.category,
      product.kind,
      ...(product.keywords ?? []),
      ...relatedTerms[product.kind],
    ]
      .map(normalize)
      .join(" ");

    return haystack.includes(normalizedQuery);
  });
}

export function filterProducts<T extends SearchableProduct>(
  products: T[],
  filter: ProductFilter,
) {
  return filter === "all" ? products : products.filter((product) => product.kind === filter);
}

export function convertCoins(
  amount: number,
  direction: ConverterDirection,
  rate: number,
) {
  if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(rate) || rate <= 0) {
    return 0;
  }

  const result = direction === "rub-to-coins" ? amount * rate : amount / rate;
  return Math.round(result * 100) / 100;
}

export function summarizeSteamTopUp(rubles: number, rate: number) {
  return {
    rubles,
    coins: convertCoins(rubles, "rub-to-coins", rate),
    rate,
  };
}

export function getCartNotice(title: string) {
  return `Товар «${title}» добавлен в корзину.`;
}
