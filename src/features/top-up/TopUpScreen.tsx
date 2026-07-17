"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { useMarketplace } from "@/components/marketplace/MarketplaceProvider";
import { Breadcrumbs, Button, Checkbox, Container, Skeleton } from "@/components/ui/UI";
import { siteConfig } from "@/config/site";
import { getTopUpQuote, validateTopUpAmount } from "@/lib/top-up";

import styles from "./top-up.module.css";

type TopUpStatus = "idle" | "loading" | "success" | "error";

function formatNumber(value: number) {
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

export function TopUpScreen({
  suggestedCoins,
  returnTo,
}: {
  suggestedCoins: number;
  returnTo: "/cart" | null;
}) {
  const {
    balanceCoins,
    cartShortfallCoins,
    isHydrated,
    creditCoins,
    notify,
  } = useMarketplace();
  const router = useRouter();
  const [amount, setAmount] = useState(String(suggestedCoins));
  const [isDirty, setIsDirty] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState<TopUpStatus>("idle");
  const [submitError, setSubmitError] = useState("");
  const [receipt, setReceipt] = useState<ReturnType<typeof getTopUpQuote> | null>(null);
  const submitLock = useRef(false);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  const authoritativeSuggestion =
    returnTo === "/cart" && cartShortfallCoins > 0 ? cartShortfallCoins : suggestedCoins;
  const displayedAmount = isDirty ? amount : String(authoritativeSuggestion);
  const amountError = validateTopUpAmount(displayedAmount);
  const showAmountError = (isTouched || isDirty) && !!amountError;
  const parsedAmount = amountError ? 0 : Number(displayedAmount);
  const quote = getTopUpQuote(parsedAmount, siteConfig.coin.rate, balanceCoins);
  const displayedQuote = receipt ?? quote;
  const isLocked = status === "loading" || status === "success";
  const paymentProviderAvailable = true;
  const canSubmit = isHydrated && paymentProviderAvailable && !amountError && accepted && !isLocked;
  const presets = [...new Set([authoritativeSuggestion, 750, 1500, 3000, 7500])].slice(0, 4);

  useEffect(() => {
    if (status === "success") successHeadingRef.current?.focus();
  }, [status]);

  function chooseAmount(value: number) {
    setAmount(String(value));
    setIsDirty(true);
    setIsTouched(true);
    setSubmitError("");
    if (status === "error") setStatus("idle");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsTouched(true);
    setSubmitError("");

    if (!canSubmit || submitLock.current) {
      if (amountError) amountInputRef.current?.focus();
      return;
    }
    submitLock.current = true;
    setStatus("loading");

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      setReceipt(quote);
      creditCoins(quote.coins);
      notify(`Баланс пополнен на ${formatNumber(quote.coins)} Coins.`);
      setStatus("success");

      if (returnTo === "/cart") {
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        router.replace("/cart?topUp=success");
      }
    } catch {
      submitLock.current = false;
      setStatus("error");
      setSubmitError("Не удалось пополнить баланс. Повторите ещё раз.");
    }
  }

  return (
    <main id="main-content" className={styles.page}>
      <Container>
        <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Пополнение баланса" }]} />
        <div className={styles.pageHeading}>
          <span>Баланс Vault</span>
          <h1>Пополнить баланс Coins</h1>
          <p>Укажите сумму Coins, проверьте расчёт и выберите способ оплаты.</p>
        </div>
        <p className={styles.demoDisclosure}>
          <strong>Безопасное пополнение</strong>
          Итоговая сумма фиксируется до подтверждения платежа.
        </p>

        {!isHydrated ? (
          <div className={styles.layout} aria-label="Загрузка формы пополнения">
            <Skeleton className={styles.formSkeleton} />
            <Skeleton className={styles.summarySkeleton} />
          </div>
        ) : (
          <div className={styles.layout}>
            <form className={styles.formCard} noValidate onSubmit={submit} aria-busy={status === "loading"}>
              {status === "success" ? (
                <div className={styles.successState} role="status">
                  <span className={styles.successMark}>✓</span>
                  <div>
                    <span>Платёж подтверждён</span>
                    <h2 ref={successHeadingRef} tabIndex={-1}>Баланс пополнен</h2>
                    <p>На баланс добавлено {formatNumber(displayedQuote.coins)} Coins.</p>
                    {returnTo === "/cart" ? (
                      <p className={styles.returnNote}>Возвращаем в корзину…</p>
                    ) : (
                      <div className={styles.successActions}>
                        <Link className={styles.primaryLink} href="/catalog">Открыть каталог</Link>
                        <Link href="/cart">Перейти в корзину</Link>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.formHeading}>
                    <span>Шаг 1 из 1</span>
                    <h2>Сумма пополнения</h2>
                    <p>Coins используются для покупки всех товаров каталога Vault.</p>
                  </div>

                  {returnTo === "/cart" && cartShortfallCoins > 0 ? (
                    <div className={styles.cartContext}>
                      <strong>Для заказа не хватает {formatNumber(cartShortfallCoins)} Coins</strong>
                      <span>Корзина сохранена. После пополнения вы вернётесь к оформлению.</span>
                    </div>
                  ) : null}

                  <fieldset className={styles.presets} disabled={isLocked}>
                    <legend>Быстрый выбор</legend>
                    <div>
                      {presets.map((value) => (
                        <button
                          key={value}
                          type="button"
                          data-selected={Number(displayedAmount) === value || undefined}
                          aria-pressed={Number(displayedAmount) === value}
                          onClick={() => chooseAmount(value)}
                        >
                          {formatNumber(value)} Coins
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  <div className={styles.field}>
                    <label htmlFor="top-up-amount">Сумма пополнения, Coins</label>
                    <div className={styles.amountControl}>
                      <input
                        ref={amountInputRef}
                        id="top-up-amount"
                        name="amount"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={displayedAmount}
                        disabled={isLocked}
                        aria-invalid={showAmountError}
                        aria-describedby={`top-up-helper${showAmountError ? " top-up-error" : ""}`}
                        onBlur={() => setIsTouched(true)}
                        onChange={(event) => {
                          setAmount(event.target.value);
                          setIsDirty(true);
                          setSubmitError("");
                        }}
                      />
                      <span>Coins</span>
                    </div>
                    <p id="top-up-helper">От 100 до 100 000 Coins. Только целое количество.</p>
                    {showAmountError ? <p id="top-up-error" className={styles.fieldError} role="alert">{amountError}</p> : null}
                  </div>

                  <div className={styles.mockMethod}>
                    <span className={styles.methodMark}>V</span>
                    <div>
                      <strong>Банковская карта или СБП</strong>
                      <p>Оплата станет доступна после подключения платёжного провайдера.</p>
                    </div>
                    <span>Недоступно</span>
                  </div>

                  <div className={styles.consentBox}>
                    <Checkbox
                      checked={accepted}
                      disabled={isLocked}
                      onChange={(event) => setAccepted(event.target.checked)}
                      label={
                        <>
                          Я принимаю условия{" "}
                          <Link href="/legal/terms" target="_blank" rel="noopener noreferrer">Пользовательского соглашения (Оферты)</Link>
                          {" "}и даю согласие на обработку персональных данных в соответствии с{" "}
                          <Link href="/legal/privacy" target="_blank" rel="noopener noreferrer">Политикой конфиденциальности</Link>.
                        </>
                      }
                    />
                  </div>

                  {submitError ? <p className={styles.submitError} role="alert">{submitError}</p> : null}

                  <Button className={styles.submitButton} type="submit" disabled={!canSubmit}>
                    {status === "loading"
                      ? "Зачисляем Coins…"
                      : amountError
                        ? "Проверьте сумму пополнения"
                        : paymentProviderAvailable
                          ? `Пополнить на ${formatNumber(quote.coins)} Coins`
                          : "Оплата пока недоступна"}
                  </Button>
                  <p className={styles.formFootnote}>Расчёт суммы доступен сейчас; проведение платежа появится после подключения провайдера.</p>
                </>
              )}
            </form>

            <aside className={styles.summaryCard} aria-labelledby="top-up-summary-title">
              <span>{receipt ? "Результат" : "Расчёт"}</span>
              <h2 id="top-up-summary-title">{receipt ? "Баланс пополнен" : "После пополнения"}</h2>
              <dl aria-live="polite">
                <div><dt>{receipt ? "Баланс до" : "Текущий баланс"}</dt><dd>{formatNumber(receipt ? receipt.balanceAfter - receipt.coins : balanceCoins)} Coins</dd></div>
                <div><dt>{receipt ? "Зачислено" : "Будет зачислено"}</dt><dd>+{formatNumber(displayedQuote.coins)} Coins</dd></div>
                <div className={styles.totalRow}><dt>{receipt ? "Текущий баланс" : "Новый баланс"}</dt><dd>{formatNumber(displayedQuote.balanceAfter)} Coins</dd></div>
              </dl>
              <div className={styles.rateInfo}>
                <div><span>Расчётный курс</span><strong>1 ₽ = {siteConfig.coin.rate.toLocaleString("ru-RU")} Coins</strong></div>
                <div><span>Расчётная стоимость</span><strong>{formatNumber(displayedQuote.rubles)} ₽</strong></div>
              </div>
              <p>Курс хранится централизованно. Финальная сумма всегда показывается до подтверждения.</p>
            </aside>
          </div>
        )}
      </Container>
    </main>
  );
}
