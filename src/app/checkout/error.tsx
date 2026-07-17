"use client";

import Link from "next/link";

import { Button, Container } from "@/components/ui/UI";
import styles from "@/features/checkout/checkout.module.css";

export default function CheckoutError({ reset }: { reset: () => void }) {
  return <main id="main-content" className={styles.page}><Container><section className={styles.guardPanel} role="alert"><span>Оформление заказа</span><h2>Не удалось открыть Checkout</h2><p>Корзина и баланс Coins сохранены. Повторите загрузку страницы.</p><div className={styles.guardActions}><Button type="button" onClick={reset}>Повторить</Button><Link href="/cart">Вернуться в корзину</Link></div></section></Container></main>;
}
