"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { catalogProducts } from "@/data/products";
import { Icon, type IconName } from "@/components/ui/Icon";
import { MarketplaceSearch } from "@/components/marketplace/MarketplaceSearch";
import { CartButton } from "@/components/marketplace/CartButton";
import { useMarketplace } from "@/components/marketplace/MarketplaceProvider";

import styles from "./layout.module.css";

const serviceNavigation: { label: string; href: string; icon: IconName }[] = [
  { label: "Все товары", href: "/catalog", icon: "bag" },
  { label: "Пополнение Steam", href: "/catalog?category=steam", icon: "steam" },
  { label: "Скины CS2", href: "/catalog?category=skins&q=CS2", icon: "shield" },
  { label: "Скины Dota 2", href: "/catalog?category=skins&q=Dota%202", icon: "shield" },
  { label: "Скины Rust", href: "/catalog?category=skins&q=Rust", icon: "shield" },
  { label: "GPT-сервисы", href: "/catalog?category=gpt", icon: "grid" },
  { label: "Пополнить Coins", href: "/balance/top-up", icon: "coin" },
];

function SyncedHeaderSearch() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  return <MarketplaceSearch key={query} products={catalogProducts} initialQuery={query} />;
}

function HeaderSearch() {
  return (
    <Suspense fallback={<MarketplaceSearch products={catalogProducts} />}>
      <SyncedHeaderSearch />
    </Suspense>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { balanceCoins, session, isHydrated } = useMarketplace();
  const [menuOpen, setMenuOpen] = useState(false);
  const [message, setMessage] = useState("");
  const accountLabel = session?.steamAccount?.displayName ?? session?.emailAccount?.displayName ?? "Войти";
  const accountHref = session ? "/account" : "/auth?returnTo=%2Faccount";

  return (
    <header className={styles.header}>
      <div className={styles.utilityBar}>
        <div className={styles.headerContainer}>
          <span>Цифровые товары для игр и сервисов</span>
          <nav aria-label="Быстрые разделы">
            <Link href="/#how-to-order">Как оформить заказ</Link>
            <Link href="/#faq">FAQ</Link>
            <span className={styles.serviceState}>Сервис 18+</span>
          </nav>
        </div>
      </div>
      <div className={styles.mainBar}>
        <div className={styles.mainGrid}>
          <Link className={styles.logo} href="/" aria-label="Vault, на главную">
            <span className={styles.logoMark}>V</span>
            <span>VAULT</span>
          </Link>
          <button
            className={`${styles.catalogButton} ${pathname.startsWith("/catalog") ? styles.catalogButtonActive : ""}`}
            type="button"
            onClick={() => {
              setMenuOpen((value) => !value);
              setMessage("");
            }}
            aria-expanded={menuOpen}
            aria-current={pathname.startsWith("/catalog") ? "page" : undefined}
          >
            <Icon name="grid" width="19" height="19" />
            Каталог
          </button>
          <div className={styles.desktopSearch}>
            <HeaderSearch />
          </div>
          <button
            type="button"
            className={styles.iconAction}
            onClick={() => setMessage("Избранное пока пусто.")}
          >
            <Icon name="heart" width="21" height="21" />
            <span>Избранное</span>
          </button>
          <Link className={styles.balance} href="/balance/top-up" aria-label={`Баланс: ${balanceCoins.toLocaleString("ru-RU")} Coins. Пополнить`}>
            <Icon name="coin" width="20" height="20" />
            <span>Баланс</span>
            <strong>{balanceCoins.toLocaleString("ru-RU")} Coins</strong>
          </Link>
          <CartButton />
          <Link
            className={styles.accountButton}
            href={accountHref}
            aria-current={pathname.startsWith("/account") || pathname === "/auth" ? "page" : undefined}
          >
            <Icon name="user" width="20" height="20" />
            <span className={styles.accountLabel}>{isHydrated ? accountLabel : "Аккаунт"}</span>
          </Link>
          <button
            type="button"
            className={styles.mobileMenuButton}
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <Icon name="menu" width="23" height="23" />
          </button>
        </div>
        <div className={styles.mobileSearch}>
          <HeaderSearch />
        </div>
      </div>
      <nav className={styles.serviceNav} aria-label="Услуги Vault">
        <div className={styles.serviceNavInner}>
          {serviceNavigation.map((item) => (
            <Link key={item.label} href={item.href}>
              <Icon name={item.icon} width="17" height="17" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      {menuOpen ? (
        <nav className={styles.catalogMenu} aria-label="Каталог">
          <div className={styles.headerContainer}>
            <Link href="/catalog" onClick={() => setMenuOpen(false)}>Все товары</Link>
            <Link href="/catalog?category=steam" onClick={() => setMenuOpen(false)}>Пополнение Steam</Link>
            <Link href="/catalog?category=skins" onClick={() => setMenuOpen(false)}>Игровые предметы</Link>
            <Link href="/catalog?category=gpt" onClick={() => setMenuOpen(false)}>GPT</Link>
            <Link className={styles.mobileAccountLink} href="/balance/top-up" onClick={() => setMenuOpen(false)}>
              Баланс: {balanceCoins.toLocaleString("ru-RU")} Coins
            </Link>
            <Link className={styles.mobileAccountLink} href={accountHref} onClick={() => setMenuOpen(false)}>
              {isHydrated ? accountLabel : "Аккаунт"}
            </Link>
          </div>
        </nav>
      ) : null}
      {message ? (
        <div className={styles.headerMessage} role="status">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage("")}>Закрыть</button>
        </div>
      ) : null}
    </header>
  );
}
