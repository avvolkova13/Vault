export const CATALOG_FEED_BATCH_SIZE = 8;

export type CatalogFeedEntry<T> = {
  key: string;
  item: T;
};

export function getNextCatalogFeedSize(currentSize: number) {
  const safeSize = Number.isFinite(currentSize) ? Math.max(0, Math.floor(currentSize)) : 0;
  return safeSize + CATALOG_FEED_BATCH_SIZE;
}

export function createCatalogFeedEntries<T extends { id: string }>(
  items: readonly T[],
  visibleSize: number,
): CatalogFeedEntry<T>[] {
  const safeSize = Number.isFinite(visibleSize) ? Math.max(0, Math.floor(visibleSize)) : 0;

  if (!items.length || safeSize === 0) return [];

  return Array.from({ length: safeSize }, (_, index) => {
    const item = items[index % items.length];
    const occurrence = Math.floor(index / items.length);

    return {
      key: `${item.id}-${occurrence}`,
      item,
    };
  });
}
