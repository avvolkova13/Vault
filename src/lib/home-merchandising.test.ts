import assert from "node:assert/strict";
import test from "node:test";

import { createPopularGridEntries } from "./home-merchandising.ts";

const products = Array.from({ length: 7 }, (_, index) => ({
  id: `product-${index + 1}`,
  category: index === 6 ? "GPT" : "Игровые предметы",
  title: `Товар ${index + 1}`,
  description: "Описание товара",
  kind: index === 6 ? ("gpt" as const) : ("skins" as const),
}));

test("популярные товары заполняют две строки, а ссылка на каталог занимает седьмую позицию", () => {
  const entries = createPopularGridEntries(products, "all");

  assert.equal(entries.length, 8);
  assert.equal(entries[6]?.type, "catalog-link");
  assert.equal(entries[7]?.type, "product");
});

test("фильтр категории не добавляет карточку перехода в каталог", () => {
  const entries = createPopularGridEntries(products, "skins");

  assert.ok(entries.every((entry) => entry.type === "product"));
});
