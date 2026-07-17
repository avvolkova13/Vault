import assert from "node:assert/strict";
import test from "node:test";

import { catalogProducts } from "../data/products.ts";
import {
  createDefaultCatalogFilters,
  filterAndSortCatalog,
  getProductStatusLabel,
  hasActiveCatalogFilters,
  parseCatalogSearchParams,
  serializeCatalogFilters,
} from "./catalog.ts";

test("URL-параметры каталога разбираются в безопасные фильтры", () => {
  const filters = parseCatalogSearchParams(new URLSearchParams([
    ["q", "  Steam  "],
    ["category", "steam"],
    ["status", "available"],
    ["status", "unknown"],
    ["type", "Пополнение баланса"],
    ["type", "Пополнение баланса"],
    ["weapon", "Автомат"],
    ["min", "750"],
    ["max", "5000"],
    ["sort", "price-desc"],
  ]));

  assert.deepEqual(filters, {
    query: "Steam",
    category: "steam",
    statuses: ["available"],
    types: ["Пополнение баланса"],
    fulfillmentModes: [],
    weaponTerms: ["Автомат"],
    minPrice: 750,
    maxPrice: 5000,
    sort: "price-desc",
  });
});

test("невалидные URL-параметры сбрасываются без NaN и отрицательных цен", () => {
  const filters = parseCatalogSearchParams(new URLSearchParams({
    category: "casino",
    min: "-50",
    max: "not-a-number",
    sort: "popular",
  }));

  assert.deepEqual(filters, createDefaultCatalogFilters());
});

test("активные фильтры сериализуются без значений по умолчанию", () => {
  const serialized = serializeCatalogFilters({
    ...createDefaultCatalogFilters(),
    query: "AK-47",
    category: "skins",
    statuses: ["available", "on-request"],
    types: ["Автомат"],
    weaponTerms: ["винтовка"],
    minPrice: 1000,
    maxPrice: 8000,
    sort: "price-asc",
  });

  assert.equal(
    serialized.toString(),
    "q=AK-47&category=skins&status=available&status=on-request&type=%D0%90%D0%B2%D1%82%D0%BE%D0%BC%D0%B0%D1%82&weapon=%D0%B2%D0%B8%D0%BD%D1%82%D0%BE%D0%B2%D0%BA%D0%B0&min=1000&max=8000&sort=price-asc",
  );
  assert.equal(serializeCatalogFilters(createDefaultCatalogFilters()).toString(), "");
});

test("категория Steam возвращает только пополнения Steam", () => {
  const result = filterAndSortCatalog(catalogProducts, {
    ...createDefaultCatalogFilters(),
    category: "steam",
  });

  assert.equal(result.length, 4);
  assert.ok(result.every((product) => product.kind === "steam"));
});

test("категория GPT возвращает только товары GPT", () => {
  const result = filterAndSortCatalog(catalogProducts, {
    ...createDefaultCatalogFilters(),
    category: "gpt",
  });

  assert.equal(result.length, 4);
  assert.ok(result.every((product) => product.kind === "gpt"));
});

test("поиск по Steam и GPT находит соответствующие категории", () => {
  const steam = filterAndSortCatalog(catalogProducts, {
    ...createDefaultCatalogFilters(),
    query: "Steam",
  });
  const gpt = filterAndSortCatalog(catalogProducts, {
    ...createDefaultCatalogFilters(),
    query: "GPT",
  });

  assert.equal(steam.length, 4);
  assert.ok(steam.every((product) => product.kind === "steam"));
  assert.equal(gpt.length, 4);
  assert.ok(gpt.every((product) => product.kind === "gpt"));
});

test("поиск работает по тексту категории и названию товара", () => {
  const category = filterAndSortCatalog(catalogProducts, {
    ...createDefaultCatalogFilters(),
    query: "Игровые предметы",
  });
  const title = filterAndSortCatalog(catalogProducts, {
    ...createDefaultCatalogFilters(),
    query: "Printstream",
  });

  assert.equal(
    category.length,
    catalogProducts.filter((product) => product.kind === "skins").length,
  );
  assert.ok(category.every((product) => product.kind === "skins"));
  assert.deepEqual(title.map((product) => product.id), [
    "m4-printstream",
    "deagle-printstream",
  ]);
});

test("поиск Пистолет возвращает только Desert Eagle", () => {
  const result = filterAndSortCatalog(catalogProducts, {
    ...createDefaultCatalogFilters(),
    query: "Пистолет",
  });

  assert.deepEqual(result.map((product) => product.id), ["deagle-printstream"]);
});

test("поиск Автомат возвращает только AK-47 и M4A1-S", () => {
  const result = filterAndSortCatalog(catalogProducts, {
    ...createDefaultCatalogFilters(),
    query: "Автомат",
  });

  assert.deepEqual(result.map((product) => product.id), [
    "ak-redline",
    "m4-printstream",
  ]);
});

test("поиск, фасеты, цена и сортировка работают совместно", () => {
  const result = filterAndSortCatalog(catalogProducts, {
    ...createDefaultCatalogFilters(),
    query: "пополнение",
    category: "steam",
    statuses: ["available"],
    types: ["Пополнение баланса"],
    fulfillmentModes: ["automatic"],
    minPrice: 1000,
    maxPrice: 5000,
    sort: "price-desc",
  });

  assert.deepEqual(result.map((product) => product.id), [
    "steam-top-up-2000",
    "steam-top-up-1000",
  ]);
});

test("фильтр по оружейному термину работает отдельно от текстового поиска", () => {
  const result = filterAndSortCatalog(catalogProducts, {
    ...createDefaultCatalogFilters(),
    category: "skins",
    weaponTerms: ["снайперская"],
  });

  assert.deepEqual(result.map((product) => product.id), ["awp-asiimov"]);
});

test("несовместимые условия возвращают пустой результат", () => {
  const result = filterAndSortCatalog(catalogProducts, {
    ...createDefaultCatalogFilters(),
    query: "GPT",
    category: "steam",
  });

  assert.deepEqual(result, []);
});

test("сброс возвращает независимое начальное состояние и все товары", () => {
  const defaults = createDefaultCatalogFilters();
  const secondDefaults = createDefaultCatalogFilters();

  assert.equal(hasActiveCatalogFilters(defaults), false);
  assert.notEqual(defaults.statuses, secondDefaults.statuses);
  assert.notEqual(defaults.types, secondDefaults.types);
  assert.notEqual(defaults.weaponTerms, secondDefaults.weaponTerms);
  assert.notEqual(defaults.fulfillmentModes, secondDefaults.fulfillmentModes);
  assert.equal(filterAndSortCatalog(catalogProducts, defaults).length, catalogProducts.length);
});

test("сортировки по цене и новизне дают предсказуемый порядок", () => {
  const priceAscending = filterAndSortCatalog(catalogProducts, {
    ...createDefaultCatalogFilters(),
    sort: "price-asc",
  });
  const newest = filterAndSortCatalog(catalogProducts, {
    ...createDefaultCatalogFilters(),
    sort: "newest",
  });

  assert.ok(priceAscending.every((product, index) => (
    index === 0 || priceAscending[index - 1].priceCoins <= product.priceCoins
  )));
  assert.equal(newest[0].id, "gpt-api-balance");
});

test("некорректные границы цены игнорируются, а обратный диапазон нормализуется", () => {
  const invalid = filterAndSortCatalog(catalogProducts, {
    ...createDefaultCatalogFilters(),
    minPrice: Number.NaN,
    maxPrice: -100,
  });
  const reversed = filterAndSortCatalog(catalogProducts, {
    ...createDefaultCatalogFilters(),
    minPrice: 5000,
    maxPrice: 1000,
  });

  assert.equal(invalid.length, catalogProducts.length);
  assert.ok(reversed.length > 0);
  assert.ok(reversed.every((product) => (
    product.priceCoins >= 1000 && product.priceCoins <= 5000
  )));
});

test("статус отображения выводится из наличия и способа выдачи", () => {
  const skin = catalogProducts.find((product) => product.id === "ak-redline");
  const steam = catalogProducts.find((product) => product.id === "steam-top-up-1000");
  const gpt = catalogProducts.find((product) => product.id === "gpt-plus");

  assert.ok(skin && steam && gpt);
  assert.equal(getProductStatusLabel(skin), "В наличии");
  assert.equal(getProductStatusLabel(steam), "Автовыдача");
  assert.equal(getProductStatusLabel(gpt), "Под заказ");
});

test("статус под заказ имеет приоритет над способом выдачи", () => {
  const steam = catalogProducts.find((product) => product.id === "steam-top-up-1000");
  assert.ok(steam);

  assert.equal(getProductStatusLabel({
    ...steam,
    availability: "on-request",
  }), "Под заказ");
});

test("все товары явно отмечены как демонстрационные", () => {
  assert.ok(catalogProducts.every((product) => product.isMock === true));
});
