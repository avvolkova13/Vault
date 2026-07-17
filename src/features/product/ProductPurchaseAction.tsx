"use client";

import Link from "next/link";

import { useMarketplace } from "@/components/marketplace/MarketplaceProvider";
import { Button } from "@/components/ui/UI";
import type { Product } from "@/types/commerce";

import styles from "./product.module.css";

export function ProductPurchaseAction({ product }: { product: Product }) {
  const { cart, addToCart } = useMarketplace();
  const selected = cart.some((item) => item.id === product.id);

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
      <Link className={styles.backLink} href={`/catalog?category=${product.kind}`}>
        Вернуться в каталог
      </Link>
    </div>
  );
}
