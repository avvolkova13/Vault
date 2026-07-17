"use client";

import { useMemo, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { Container, Section } from "@/components/ui/UI";
import { siteConfig } from "@/config/site";
import { convertCoins, type ConverterDirection } from "@/lib/marketplace";

import styles from "./home.module.css";

export function CoinConverter() {
  const [direction, setDirection] = useState<ConverterDirection>("rub-to-coins");
  const [amount, setAmount] = useState(1000);
  const result = useMemo(() => convertCoins(amount, direction, siteConfig.coin.rate), [amount, direction]);
  const isRubles = direction === "rub-to-coins";

  return (
    <Section className={styles.converterSection}>
      <Container className={styles.converterLayout}>
        <div className={styles.converterHeading}>
          <span className={styles.coinIcon}><Icon name="coin" width="30" height="30" /></span>
          <div>
            <h2>Калькулятор Coins</h2>
            <p>Рассчитайте стоимость покупки или пополнения.</p>
          </div>
        </div>
        <div className={styles.converterControls}>
          <div className={styles.modeSwitch} role="group" aria-label="Направление конвертации">
            <button type="button" aria-pressed={isRubles} onClick={() => setDirection("rub-to-coins")}>Рубли → Coins</button>
            <button type="button" aria-pressed={!isRubles} onClick={() => setDirection("coins-to-rub")}>Coins → Рубли</button>
          </div>
          <div className={styles.converterFields}>
            <label>
              <span>{isRubles ? "Рубли" : "Coins"}</span>
              <input type="number" min="0" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
            </label>
            <span className={styles.convertArrow}>→</span>
            <div className={styles.converterResult}>
              <span>{isRubles ? "Coins" : "Рубли"}</span>
              <strong>{result.toLocaleString("ru-RU")} {isRubles ? "Coins" : "₽"}</strong>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
