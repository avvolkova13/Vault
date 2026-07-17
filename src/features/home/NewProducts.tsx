"use client";

import Image from "next/image";

import { useMarketplace } from "@/components/marketplace/MarketplaceProvider";
import { Button, Container, Section, SectionHeading, StatusBadge } from "@/components/ui/UI";
import { getProductStatusLabel } from "@/lib/catalog";
import { getProductVisualLabel } from "@/lib/product-visual";
import type { Product } from "@/types/commerce";

import styles from "./home.module.css";

export function NewProducts({ products }: { products: Product[] }) {
  const { cart, addToCart } = useMarketplace();

  return (
    <Section id="new-products">
      <Container>
        <SectionHeading title="Новое в каталоге" description="Недавно добавленные категории и товары." />
        <div className={styles.newList}>
          {products.map((product) => {
            const selected = cart.some((item) => item.id === product.id);
            return (
              <article key={product.id} className={styles.newItem}>
                <div className={styles.newThumb}>
                  {product.image ? (
                    <Image src={product.image} alt={product.imageAlt ?? product.title} fill sizes="92px" />
                  ) : (
                    <span>{getProductVisualLabel(product)}</span>
                  )}
                </div>
                <div className={styles.newCopy}>
                  <span>{product.category}</span>
                  <h3>{product.title}</h3>
                  <p>{product.description}</p>
                </div>
                <div className={styles.newStatus}>
                  <StatusBadge tone={product.availability === "on-request" ? "warning" : "success"}>
                    {getProductStatusLabel(product)}
                  </StatusBadge>
                </div>
                <div className={styles.newPrice}><strong>{product.priceCoins.toLocaleString("ru-RU")}</strong><span>Coins</span></div>
                <Button
                  type="button"
                  tone={selected ? "secondary" : "primary"}
                  disabled={selected}
                  onClick={() => addToCart({ id: product.id, title: product.title })}
                >
                  {selected ? "Добавлено" : "Купить"}
                </Button>
              </article>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}
