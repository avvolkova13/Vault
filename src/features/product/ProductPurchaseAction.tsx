"use client";

import Link from "next/link";
import { useState } from "react";

import { useMarketplace } from "@/components/marketplace/MarketplaceProvider";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/UI";
import type { Product } from "@/types/commerce";

import styles from "./product.module.css";

export function ProductPurchaseAction({ product }: { product: Product }) {
  const { cart, addToCart, notify } = useMarketplace();
  const selected = cart.some((item) => item.id === product.id);
  const [isFavorite, setIsFavorite] = useState(false);

  function toggleFavorite() {
    const nextFavorite = !isFavorite;
    setIsFavorite(nextFavorite);
    notify(
      nextFavorite
        ? `Товар «${product.title}» добавлен в избранное.`
        : `Товар «${product.title}» удалён из избранного.`,
    );
  }

  return (
    <div className={styles.purchaseActions}>
      <Button
        className={styles.addButton}
        type="button"
        disabled={selected}
        onClick={() => addToCart({ id: product.id, title: product.title })}
      >
        {selected ? "Добавлено в корзину" : "Добавить в корзину"}
      </Button>
      <Button
        className={styles.favoriteAction}
        tone="secondary"
        type="button"
        aria-pressed={isFavorite}
        data-active={isFavorite || undefined}
        onClick={toggleFavorite}
      >
        <Icon name="heart" width="18" height="18" />
        {isFavorite ? "В избранном" : "В избранное"}
      </Button>
      <Link className={styles.backLink} href={`/catalog?category=${product.kind}`}>
        Вернуться в каталог
      </Link>
    </div>
  );
}
