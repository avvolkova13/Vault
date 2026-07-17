"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  type CheckoutResult,
  useMarketplace,
} from "@/components/marketplace/MarketplaceProvider";
import { Breadcrumbs, Button, Checkbox, Container, Skeleton, StatusBadge } from "@/components/ui/UI";
import { canSubmitCheckout, getCheckoutGate, type CheckoutGate } from "@/lib/checkout";
import { getProductVisualLabel } from "@/lib/product-visual";
import type { Product } from "@/types/commerce";

import styles from "./checkout.module.css";

type CheckoutStatus = "idle" | "submitting" | "success";

const kindLabel: Record<Product["kind"], string> = {
  skins: "Игровой предмет",
  steam: "Steam",
  gpt: "GPT",
};

const resultMessage: Record<Exclude<CheckoutResult["status"], "success" | "busy">, string> = {
  empty: "Корзина уже пуста. Вернитесь в каталог и добавьте товар.",
  insufficient: "Баланс изменился. Пополните недостающие Coins и повторите оформление.",
  "auth-required": "Сессия завершена. Войдите в аккаунт и повторите оформление.",
  "steam-required": "Для игровых предметов требуется подключение Steam.",
};

function formatCoins(value: number) {
  return value.toLocaleString("ru-RU");
}

function CheckoutMedia({ product }: { product: Product }) {
  if (product.image) {
    return <Image src={product.image} alt={product.imageAlt ?? ""} fill sizes="(max-width: 720px) 92px, 116px" />;
  }

  return <span className={styles.serviceMedia} aria-hidden="true"><strong>{getProductVisualLabel(product)}</strong><small>{product.productType}</small></span>;
}

function CheckoutSkeleton() {
  return <div className={styles.checkoutLayout} aria-label="Загрузка оформления заказа"><Skeleton className={styles.itemsSkeleton} /><Skeleton className={styles.summarySkeleton} /></div>;
}

function GuardState({ gate, shortfall, requiresSteam }: { gate: Exclude<CheckoutGate, "ready">; shortfall: number; requiresSteam: boolean }) {
  const content = {
    empty: {
      eyebrow: "Корзина",
      title: "Нет товаров для оформления",
      description: "Добавьте цифровой товар из каталога, затем вернитесь к оформлению.",
      action: <Link className={styles.primaryLink} href="/catalog">Открыть каталог</Link>,
    },
    insufficient: {
      eyebrow: "Баланс Coins",
      title: `Не хватает ${formatCoins(shortfall)} Coins`,
      description: "Корзина сохранена. После пополнения вы вернётесь к заказу.",
      action: <Link className={styles.primaryLink} href={`/balance/top-up?returnTo=%2Fcart&requiredCoins=${shortfall}`}>Пополнить баланс</Link>,
    },
    "auth-required": {
      eyebrow: "Аккаунт",
      title: "Войдите для оформления",
      description: requiresSteam ? "Для игрового предмета требуется вход через Steam." : "После входа вы вернётесь к оформлению заказа.",
      action: <Link className={styles.primaryLink} href={`/auth?method=${requiresSteam ? "steam" : "email"}&returnTo=%2Fcheckout${requiresSteam ? "&required=steam" : ""}`}>{requiresSteam ? "Подключить Steam" : "Войти в аккаунт"}</Link>,
    },
    "steam-required": {
      eyebrow: "Steam",
      title: "Подключите Steam",
      description: "Steam обязателен для покупки и получения игровых предметов.",
      action: <Link className={styles.primaryLink} href="/auth?method=steam&returnTo=%2Fcheckout&required=steam">Подключить Steam</Link>,
    },
  }[gate];

  return <section className={styles.guardPanel}><span>{content.eyebrow}</span><h2>{content.title}</h2><p>{content.description}</p><div className={styles.guardActions}>{content.action}<Link href="/cart">Вернуться в корзину</Link></div></section>;
}

export function CheckoutScreen() {
  const {
    cart,
    balanceCoins,
    cartTotalCoins,
    cartShortfallCoins,
    isAuthenticated,
    requiresSteam,
    hasSteam,
    isHydrated,
    checkoutCart,
  } = useMarketplace();
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState<CheckoutStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [receipt, setReceipt] = useState<Extract<CheckoutResult, { status: "success" }> | null>(null);
  const submitLock = useRef(false);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  const gate = getCheckoutGate({
    itemCount: cart.length,
    totalCoins: cartTotalCoins,
    balanceCoins,
    isAuthenticated,
    requiresSteam,
    hasSteam,
  });
  const canSubmit = canSubmitCheckout(gate, accepted) && status === "idle";

  useEffect(() => {
    if (receipt) successHeadingRef.current?.focus();
  }, [receipt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (!canSubmit || submitLock.current) return;

    submitLock.current = true;
    setStatus("submitting");
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    const result = checkoutCart();

    if (result.status === "success") {
      setReceipt(result);
      setStatus("success");
      return;
    }

    submitLock.current = false;
    setStatus("idle");
    if (result.status !== "busy") setErrorMessage(resultMessage[result.status]);
  }

  return (
    <main id="main-content" className={styles.page}>
      <Container>
        <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Корзина", href: "/cart" }, { label: "Оформление заказа" }]} />
        <div className={styles.pageHeading}>
          <div><span>Последний шаг</span><h1>Оформление заказа</h1><p>Проверьте товары, получение и итоговую стоимость в Coins.</p></div>
          {isHydrated && cart.length ? <span className={styles.stepBadge}>Шаг 2 из 2</span> : null}
        </div>
        <p className={styles.demoDisclosure}><strong>Защищённый заказ</strong>Проверьте состав и способ получения перед подтверждением.</p>

        {!isHydrated ? <CheckoutSkeleton /> : receipt ? (
          <section className={styles.successPanel} aria-labelledby="checkout-success-title">
            <span className={styles.successMark} aria-hidden="true">✓</span>
            <div><span>Заказ {receipt.orderNumber}</span><h2 id="checkout-success-title" ref={successHeadingRef} tabIndex={-1}>Заказ оформлен</h2><p>{formatCoins(receipt.totalCoins)} Coins списаны с баланса. Заказ добавлен в историю покупок.</p><dl><div><dt>Товаров</dt><dd>{receipt.itemCount}</dd></div><div><dt>Остаток</dt><dd>{formatCoins(receipt.remainingCoins)} Coins</dd></div></dl><div className={styles.successActions}><Link className={styles.primaryLink} href="/account/purchases">Мои покупки</Link><Link href="/catalog">Продолжить покупки</Link></div></div>
          </section>
        ) : gate !== "ready" ? <GuardState gate={gate} shortfall={cartShortfallCoins} requiresSteam={requiresSteam} /> : (
          <form className={styles.checkoutLayout} noValidate aria-busy={status === "submitting"} onSubmit={submit}>
            <div className={styles.mainColumn}>
              <section className={styles.panel} aria-labelledby="checkout-items-title">
                <div className={styles.sectionHeading}><div><span>Состав заказа</span><h2 id="checkout-items-title">Товары</h2></div><Link href="/cart">Изменить корзину</Link></div>
                <ul className={styles.itemList}>
                  {cart.map((product) => <li key={product.id}><article className={styles.itemRow}><Link className={styles.itemMedia} href={`/catalog/${product.slug}`} aria-label={`Открыть товар «${product.title}»`}><CheckoutMedia product={product} /></Link><div className={styles.itemInfo}><span>{kindLabel[product.kind]}</span><h3><Link href={`/catalog/${product.slug}`}>{product.title}</Link></h3><p>{product.details.fulfillment.title}</p></div><div className={styles.itemPrice}><StatusBadge tone={product.availability === "available" ? "success" : "warning"}>{product.availability === "available" ? "В наличии" : "Под заказ"}</StatusBadge><p><strong>{formatCoins(product.priceCoins)}</strong> Coins</p></div></article></li>)}
                </ul>
              </section>

              <section className={styles.panel} aria-labelledby="checkout-delivery-title">
                <div className={styles.sectionHeading}><div><span>Получение</span><h2 id="checkout-delivery-title">Условия заказа</h2></div></div>
                <div className={styles.deliveryGrid}>{cart.map((product) => <article key={product.id}><span>{product.kind === "skins" ? "ST" : product.kind === "steam" ? "S" : "GPT"}</span><div><strong>{product.details.fulfillment.title}</strong><p>{product.details.fulfillment.description}</p></div><StatusBadge tone={product.kind === "skins" ? "neutral" : "success"}>{product.kind === "skins" ? "Steam подключён" : "Данные после заказа"}</StatusBadge></article>)}</div>
              </section>
            </div>

            <aside className={styles.summaryPanel} aria-labelledby="checkout-summary-title">
              <span>Сводка</span><h2 id="checkout-summary-title">К оплате</h2>
              <dl className={styles.summaryFacts}><div><dt>Товаров</dt><dd>{cart.length}</dd></div><div><dt>Баланс</dt><dd>{formatCoins(balanceCoins)} Coins</dd></div><div><dt>После покупки</dt><dd>{formatCoins(balanceCoins - cartTotalCoins)} Coins</dd></div></dl>
              <div className={styles.totalRow}><span>Итого</span><p><strong>{formatCoins(cartTotalCoins)}</strong> Coins</p></div>
              <div className={styles.readyState}><strong>Можно оформить</strong><span>{requiresSteam ? "Steam подключён, Coins достаточно." : "Coins достаточно, данные заказа проверены."}</span></div>
              <div className={styles.consentBox} id="checkout-consent-helper">
                <Checkbox checked={accepted} disabled={status === "submitting"} onChange={(event) => setAccepted(event.target.checked)} label={<>Я принимаю условия <Link href="/legal/terms" target="_blank" rel="noopener noreferrer">Пользовательского соглашения (Оферты)</Link> и даю согласие на обработку персональных данных в соответствии с <Link href="/legal/privacy" target="_blank" rel="noopener noreferrer">Политикой конфиденциальности</Link>.</>} />
              </div>
              {errorMessage ? <p className={styles.inlineError} role="alert">{errorMessage}</p> : null}
              <Button className={styles.submitButton} type="submit" disabled={!canSubmit} aria-describedby={!accepted ? "checkout-consent-helper" : undefined}>{status === "submitting" ? "Оформляем…" : `Оформить за ${formatCoins(cartTotalCoins)} Coins`}</Button>
              <p className={styles.summaryFootnote}>Нажимая кнопку, вы подтверждаете состав заказа и списание Coins.</p>
              <Link className={styles.backLink} href="/cart">Вернуться в корзину</Link>
            </aside>
          </form>
        )}
      </Container>
    </main>
  );
}
