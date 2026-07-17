"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { searchProducts } from "@/lib/marketplace";
import type { Product } from "@/types/commerce";
import { Icon } from "@/components/ui/Icon";

import styles from "./marketplace.module.css";

export function MarketplaceSearch({
  products,
  variant = "header",
  initialQuery = "",
}: {
  products: Product[];
  variant?: "header" | "hero";
  initialQuery?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const listId = useId();
  const results = useMemo(() => searchProducts(products, query).slice(0, 5), [products, query]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = query.trim();
    setOpen(false);
    router.push(normalizedQuery ? `/catalog?q=${encodeURIComponent(normalizedQuery)}` : "/catalog");
  }

  return (
    <div className={`${styles.searchWrap} ${styles[variant]}`}>
      <form className={styles.searchForm} role="search" onSubmit={submit}>
        <Icon name="search" width="20" height="20" />
        <label className={styles.srOnly} htmlFor={`${listId}-input`}>
          Поиск по каталогу
        </label>
        <input
          id={`${listId}-input`}
          type="search"
          role="combobox"
          value={query}
          placeholder="Найти товар, категорию или описание"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open && Boolean(query.trim())}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        />
        <button type="submit">Найти</button>
      </form>
      {open && query.trim() ? (
        <div id={listId} className={styles.searchResults} role="listbox">
          {results.length ? (
            results.map((product) => (
              <Link
                key={product.id}
                href={`/catalog/${product.slug}`}
                role="option"
                aria-selected="false"
                onClick={() => setOpen(false)}
              >
                <span className={styles.resultType}>{product.category}</span>
                <strong>{product.title}</strong>
                <span className={styles.resultPrice}>{product.priceCoins.toLocaleString("ru-RU")} Coins</span>
              </Link>
            ))
          ) : (
            <div className={styles.emptySearch}>Ничего не найдено. Измените запрос.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
