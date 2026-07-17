"use client";

import Image from "next/image";
import Link from "next/link";

import { Button, StatusBadge } from "@/components/ui/UI";
import { Icon } from "@/components/ui/Icon";
import { getProductStatusLabel } from "@/lib/catalog";
import type { Product } from "@/types/commerce";

import { useMarketplace } from "./MarketplaceProvider";
import styles from "./marketplace.module.css";

function ProductVisual({ product, priority = false }: { product: Product; priority?: boolean }) {
  if (product.image) {
    return (
      <Image
        src={product.image}
        alt={product.imageAlt ?? product.title}
        fill
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        sizes="(max-width: 680px) 78vw, (max-width: 1080px) 42vw, 260px"
      />
    );
  }

  const isSteam = product.kind === "steam";
  const visualLabel = product.kind === "skins" ? product.game ?? "SKIN" : "GPT";
  const visualCaption = product.kind === "skins" ? "Steam item" : "Digital access";

  return (
    <div className={`${styles.serviceVisual} ${styles[product.kind]}`} aria-hidden="true">
      {isSteam ? <Icon name="steam" width="54" height="54" /> : <span>{visualLabel}</span>}
      <small>{isSteam ? "Steam Wallet" : visualCaption}</small>
    </div>
  );
}

export function ProductCard({
  product,
  compact = false,
  priority = false,
  headingLevel = 3,
}: {
  product: Product;
  compact?: boolean;
  priority?: boolean;
  headingLevel?: 2 | 3;
}) {
  const { cart, addToCart } = useMarketplace();
  const selected = cart.some((item) => item.id === product.id);
  const ProductTitle = `h${headingLevel}` as "h2" | "h3";

  return (
    <article className={`${styles.productCard} ${compact ? styles.compactCard : ""}`}>
      <div className={styles.productMedia}>
        <span className={styles.productCategory}>{product.category}</span>
        <Link
          className={styles.productVisualLink}
          href={`/catalog/${product.slug}`}
          aria-label={`Открыть товар «${product.title}»`}
        >
          <ProductVisual product={product} priority={priority} />
        </Link>
      </div>
      <div className={styles.productBody}>
        <div className={styles.productMeta}>
          {product.meta.slice(0, compact ? 2 : 3).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <ProductTitle>
          <Link className={styles.productTitleLink} href={`/catalog/${product.slug}`}>
            {product.title}
          </Link>
        </ProductTitle>
        {!compact ? <p>{product.description}</p> : null}
        <div className={styles.productState}>
          <StatusBadge tone={product.availability === "on-request" ? "warning" : "success"}>
            {getProductStatusLabel(product)}
          </StatusBadge>
        </div>
        <div className={styles.productFooter}>
          <div className={styles.price}>
            <strong>{product.priceCoins.toLocaleString("ru-RU")}</strong>
            <span>Coins</span>
          </div>
          <Button
            tone={selected ? "secondary" : "primary"}
            type="button"
            onClick={() => addToCart({ id: product.id, title: product.title })}
            disabled={selected}
          >
            {selected ? "Добавлено" : "Купить"}
          </Button>
        </div>
      </div>
    </article>
  );
}
