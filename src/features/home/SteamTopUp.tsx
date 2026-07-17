"use client";

import { useMemo, useState, type FormEvent } from "react";

import { Icon } from "@/components/ui/Icon";
import { Button, Container, Section } from "@/components/ui/UI";
import { siteConfig } from "@/config/site";
import { summarizeSteamTopUp } from "@/lib/marketplace";

import styles from "./home.module.css";

const amounts = [500, 1000, 2500];

export function SteamTopUp() {
  const [login, setLogin] = useState("");
  const [amount, setAmount] = useState(1000);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const summary = useMemo(() => summarizeSteamTopUp(amount, siteConfig.coin.rate), [amount]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (login.trim().length < 3) {
      setError("Введите логин Steam.");
      setStatus("idle");
      return;
    }
    if (!Number.isFinite(amount) || amount < 100) {
      setError("Укажите сумму от 100 ₽.");
      setStatus("idle");
      return;
    }
    setError("");
    setStatus("loading");
    window.setTimeout(() => setStatus("success"), 420);
  }

  return (
    <Section id="steam-top-up" className={styles.steamSection}>
      <Container className={styles.steamLayout}>
        <div className={styles.steamIntro}>
          <div className={styles.steamEmblem}><Icon name="steam" width="62" height="62" /></div>
          <span className={styles.sectionCode}>STEAM WALLET</span>
          <h2>Пополнить баланс Steam</h2>
          <p>Укажите аккаунт и сумму пополнения.</p>
          <div className={styles.steamFacts}>
            <span><Icon name="check" width="17" height="17" /> Проверка данных перед расчетом</span>
            <span><Icon name="shield" width="17" height="17" /> Пароль Steam не требуется</span>
          </div>
        </div>
        <form className={styles.steamForm} onSubmit={submit} noValidate>
          <div className={styles.formGrid}>
            <label>
              <span>Логин Steam</span>
              <input
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                placeholder="Введите логин"
                autoComplete="username"
                aria-describedby="steam-helper steam-error"
              />
            </label>
            <label>
              <span>Сумма</span>
              <div className={styles.amountInput}>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={amount}
                  onChange={(event) => setAmount(Number(event.target.value))}
                  inputMode="numeric"
                />
                <span>₽</span>
              </div>
            </label>
          </div>
          <div className={styles.amounts} aria-label="Быстрый выбор суммы">
            {amounts.map((value) => (
              <button type="button" key={value} onClick={() => setAmount(value)} aria-pressed={amount === value}>
                {value.toLocaleString("ru-RU")} ₽
              </button>
            ))}
          </div>
          <p id="steam-helper" className={styles.helper}>
            Мы никогда не запрашиваем пароль от вашего аккаунта Steam.
          </p>
          {error ? <p id="steam-error" className={styles.formError} role="alert">{error}</p> : null}
          {status === "success" ? <p className={styles.formSuccess} role="status">Расчет готов. Проверьте данные.</p> : null}
          <div className={styles.steamSummary}>
            <div><span>К пополнению</span><strong>{summary.rubles.toLocaleString("ru-RU")} ₽</strong></div>
            <div><span>Стоимость</span><strong>{summary.coins.toLocaleString("ru-RU")} Coins</strong></div>
            <div><span>Курс</span><strong>1 ₽ = {summary.rate} Coins</strong></div>
          </div>
          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Рассчитываем..." : "Рассчитать пополнение"}
          </Button>
        </form>
      </Container>
    </Section>
  );
}
