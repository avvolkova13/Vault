import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeSupportDraft,
  validateSupportDraft,
} from "./support.ts";

test("черновик поддержки нормализует поля и сохраняет допустимую категорию", () => {
  assert.deepEqual(normalizeSupportDraft({
    category: "steam",
    orderId: " order-1 ",
    subject: "  Не приходит предложение обмена  ",
    message: "  Проверил Trade URL, но предложение пока не появилось.  ",
    updatedAt: "2026-07-16T08:00:00.000Z",
  }), {
    category: "steam",
    orderId: "order-1",
    subject: "Не приходит предложение обмена",
    message: "Проверил Trade URL, но предложение пока не появилось.",
    updatedAt: "2026-07-16T08:00:00.000Z",
  });
});

test("повреждённый локальный черновик поддержки отклоняется", () => {
  assert.equal(normalizeSupportDraft({ category: "telegram", message: 42 }), null);
  assert.equal(normalizeSupportDraft("broken"), null);
  assert.equal(normalizeSupportDraft({
    category: "payment",
    orderId: "",
    subject: "",
    message: "",
    updatedAt: "2026-07-16T08:00:00.000Z",
  }), null);
});

test("форма требует тему и содержательное описание", () => {
  assert.deepEqual(validateSupportDraft({
    category: "payment",
    orderId: "",
    subject: "Сбой",
    message: "Коротко",
  }), {
    subject: "Опишите тему минимум в 5 символах.",
    message: "Добавьте детали обращения — минимум 20 символов.",
  });
});

test("корректное обращение не содержит ошибок", () => {
  assert.deepEqual(validateSupportDraft({
    category: "refund",
    orderId: "order-1",
    subject: "Вопрос по возврату",
    message: "Укажите, пожалуйста, какие данные нужны для проверки заказа.",
  }), {});
});
