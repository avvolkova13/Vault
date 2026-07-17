import { filterProducts, type ProductFilter, type SearchableProduct } from "./marketplace.ts";

export type PopularGridEntry<T extends SearchableProduct> =
  | { type: "product"; product: T }
  | { type: "catalog-link" };

const catalogLinkPosition = 6;

export function createPopularGridEntries<T extends SearchableProduct>(
  products: T[],
  filter: ProductFilter,
): PopularGridEntry<T>[] {
  const visible = filterProducts(products, filter);
  const productEntries: PopularGridEntry<T>[] = visible.map((product) => ({
    type: "product",
    product,
  }));

  if (filter !== "all" || productEntries.length <= catalogLinkPosition) {
    return productEntries;
  }

  return [
    ...productEntries.slice(0, catalogLinkPosition),
    { type: "catalog-link" },
    ...productEntries.slice(catalogLinkPosition),
  ];
}
