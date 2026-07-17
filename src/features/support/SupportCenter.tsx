"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useMarketplace } from "@/components/marketplace/MarketplaceProvider";
import { Button, StatusBadge } from "@/components/ui/UI";
import { faqItems } from "@/data/home";
import { sortOrdersNewestFirst } from "@/lib/account";
import {
  normalizeSupportDraft,
  supportCategories,
  validateSupportDraft,
} from "@/lib/support";
import type { FAQ } from "@/types/commerce";
import type {
  SupportCategory,
  SupportDraft,
  SupportDraftErrors,
  SupportDraftInput,
} from "@/types/support";

import styles from "./support.module.css";

const STORAGE_KEY = "vault-support-draft-v1";

const emptyForm: SupportDraftInput = {
  category: "payment",
  orderId: "",
  subject: "",
  message: "",
};

const faqGroupByCategory: Record<SupportCategory, FAQ["group"] | null> = {
  payment: "Безопасность",
  steam: "Steam",
  skins: "Steam",
  refund: "Возвраты",
  other: null,
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatSavedTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function SupportCenter() {
  const { orders, session, notify } = useMarketplace();
  const [form, setForm] = useState<SupportDraftInput>(emptyForm);
  const [errors, setErrors] = useState<SupportDraftErrors>({});
  const [savedDraft, setSavedDraft] = useState<SupportDraft | null>(null);
  const sortedOrders = useMemo(() => sortOrdersNewestFirst(orders), [orders]);
  const activeFaq = useMemo(() => {
    const group = faqGroupByCategory[form.category];
    return (group ? faqItems.filter((item) => item.group === group) : faqItems).slice(0, 4);
  }, [form.category]);

  useEffect(() => {
    let storedDraft: SupportDraft | null = null;
    try {
      const rawDraft = window.localStorage.getItem(STORAGE_KEY);
      storedDraft = rawDraft ? normalizeSupportDraft(JSON.parse(rawDraft)) : null;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    if (!storedDraft) return;
    const hydrationTask = window.setTimeout(() => {
      setForm({
        category: storedDraft.category,
        orderId: storedDraft.orderId,
        subject: storedDraft.subject,
        message: storedDraft.message,
      });
      setSavedDraft(storedDraft);
    }, 0);
    return () => window.clearTimeout(hydrationTask);
  }, []);

  function updateField<Key extends keyof SupportDraftInput>(key: Key, value: SupportDraftInput[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "subject" || key === "message") setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function saveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateSupportDraft(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const draft: SupportDraft = {
      category: form.category,
      orderId: form.orderId.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    setForm({ category: draft.category, orderId: draft.orderId, subject: draft.subject, message: draft.message });
    setSavedDraft(draft);
    notify("Обращение отправлено. Ответ появится в личном кабинете.");
  }

  function clearDraft() {
    window.localStorage.removeItem(STORAGE_KEY);
    setForm(emptyForm);
    setSavedDraft(null);
    setErrors({});
    notify("Форма обращения очищена.");
  }

  return (
    <div className={styles.stack}>
      <section className={styles.lead}>
        <div>
          <span>Центр помощи</span>
          <h2>Связаться с поддержкой</h2>
          <p>Опишите проблему и при необходимости привяжите заказ. Ответ появится в личном кабинете.</p>
        </div>
        <div className={styles.channelState}>
          <span>Среднее время ответа</span>
          <StatusBadge>До 15 минут</StatusBadge>
          <small>Поддержка работает ежедневно и отвечает по очереди.</small>
        </div>
      </section>

      <div className={styles.supportLayout}>
        <section className={styles.panel}>
          <div className={styles.sectionHeading}>
            <div><span>Новое обращение</span><h2>Расскажите, что случилось</h2><p>Обязательные поля отмечены звёздочкой.</p></div>
            {savedDraft ? <StatusBadge>Отправлено</StatusBadge> : null}
          </div>

          <form className={styles.form} noValidate onSubmit={saveDraft}>
            <fieldset className={styles.categoryFieldset}>
              <legend>Категория *</legend>
              <div className={styles.categoryGrid}>
                {supportCategories.map((category) => (
                  <button key={category.value} type="button" aria-pressed={form.category === category.value} onClick={() => updateField("category", category.value)}>
                    <span aria-hidden="true">{category.value === "payment" ? "₽" : category.value === "steam" ? "ST" : category.value === "skins" ? "AK" : category.value === "refund" ? "↩" : "?"}</span>
                    {category.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className={styles.field}>
              <label htmlFor="support-order">Заказ</label>
              <select id="support-order" value={form.orderId} onChange={(event) => updateField("orderId", event.target.value)}>
                <option value="">Без привязки к заказу</option>
                {sortedOrders.map((order) => <option key={order.id} value={order.id}>{order.number} · {order.items[0].title} · {formatDate(order.createdAt)}</option>)}
              </select>
              <p>Выберите заказ, если вопрос связан с оплатой, предметом или возвратом.</p>
            </div>

            <div className={styles.field}>
              <label htmlFor="support-subject">Тема *</label>
              <input id="support-subject" value={form.subject} maxLength={90} aria-invalid={!!errors.subject} aria-describedby={errors.subject ? "support-subject-error" : undefined} placeholder="Например: не приходит предложение обмена" onChange={(event) => updateField("subject", event.target.value)} />
              <div className={styles.fieldMeta}><span>{errors.subject ? <span id="support-subject-error" className={styles.error} role="alert">{errors.subject}</span> : "Коротко опишите проблему."}</span><small>{form.subject.length}/90</small></div>
            </div>

            <div className={styles.field}>
              <label htmlFor="support-message">Описание *</label>
              <textarea id="support-message" value={form.message} maxLength={1500} rows={7} aria-invalid={!!errors.message} aria-describedby={errors.message ? "support-message-error" : undefined} placeholder="Что произошло, когда и какой результат вы ожидали?" onChange={(event) => updateField("message", event.target.value)} />
              <div className={styles.fieldMeta}><span>{errors.message ? <span id="support-message-error" className={styles.error} role="alert">{errors.message}</span> : "Не добавляйте пароли, платёжные реквизиты и коды Steam Guard."}</span><small>{form.message.length}/1500</small></div>
            </div>

            <div className={styles.formFooter}>
              <div>
                <Button type="submit">Отправить обращение</Button>
                {savedDraft ? <Button type="button" tone="quiet" onClick={clearDraft}>Новое обращение</Button> : null}
              </div>
              <p>{savedDraft ? `Отправлено ${formatSavedTime(savedDraft.updatedAt)}. Мы уведомим вас об ответе.` : "Ответ поддержки появится в этом разделе и будет привязан к аккаунту."}</p>
            </div>
          </form>
        </section>

        <aside className={styles.sideColumn} aria-label="Подсказки поддержки">
          <section className={styles.sidePanel}>
            <span>Перед обращением</span>
            <h2>Что подготовить</h2>
            <ol><li>Номер заказа или операции</li><li>Точное описание проблемы</li><li>Время возникновения ошибки</li></ol>
            <p>Профиль: <strong>{session?.emailAccount?.email ?? session?.steamAccount?.displayName ?? "Vault Player"}</strong></p>
          </section>

          <section className={styles.sidePanel}>
            <div className={styles.faqHeading}><div><span>FAQ по теме</span><h2>{supportCategories.find((category) => category.value === form.category)?.label}</h2></div><Link href="/#faq">Все вопросы</Link></div>
            <div className={styles.faqList}>{activeFaq.map((item) => <details key={item.id}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>
          </section>

          {sortedOrders.length ? <section className={styles.sidePanel}><span>Последние покупки</span><h2>Быстрый переход</h2><div className={styles.orderLinks}>{sortedOrders.slice(0, 3).map((order) => <Link key={order.id} href="/account/purchases"><strong>{order.number}</strong><small>{order.items[0].title}</small></Link>)}</div></section> : null}
        </aside>
      </div>
    </div>
  );
}
