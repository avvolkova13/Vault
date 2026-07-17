import assert from "node:assert/strict";
import test from "node:test";

import {
  connectAuthAccount,
  createMockEmailUser,
  createMockSteamUser,
  isMarketplaceSession,
  isMarketplaceUser,
  sanitizeAuthReturnPath,
  validateEmail,
  validateMockCode,
} from "./auth.ts";

test("email проходит обязательную и форматную валидацию", () => {
  assert.equal(validateEmail(""), "Укажите email.");
  assert.equal(validateEmail("vault"), "Введите email в формате name@example.com.");
  assert.equal(validateEmail("user@example.com"), "");
});

test("одноразовый email-код проходит обязательную и форматную проверку", () => {
  assert.equal(validateMockCode(""), "Введите код из письма.");
  assert.equal(validateMockCode("123"), "Код должен содержать 6 цифр.");
  assert.equal(validateMockCode("123456"), "Неверный код. Проверьте шесть цифр из письма.");
  assert.equal(validateMockCode("482913"), "");
});

test("mock Steam-сессия отмечена как подключённый Steam", () => {
  const user = createMockSteamUser();
  assert.equal(user.method, "steam");
  assert.equal(user.steamConnected, true);
  assert.equal(isMarketplaceUser(user), true);
});

test("email-сессия не подменяет обязательное подключение Steam", () => {
  const user = createMockEmailUser("USER@Example.com");
  assert.equal(user.email, "user@example.com");
  assert.equal(user.steamConnected, false);
  assert.equal(isMarketplaceUser(user), true);
});

test("Email и Steam подключаются аддитивно в одной сессии", () => {
  const withEmail = connectAuthAccount(null, createMockEmailUser("user@example.com"));
  const withBoth = connectAuthAccount(withEmail, createMockSteamUser());
  assert.equal(withBoth.emailAccount?.email, "user@example.com");
  assert.equal(withBoth.steamAccount?.steamConnected, true);
  assert.equal(isMarketplaceSession(withBoth), true);
});

test("повреждённая сессия отклоняется", () => {
  assert.equal(isMarketplaceUser({ method: "steam", displayName: "Demo" }), false);
  assert.equal(isMarketplaceUser(null), false);
  assert.equal(isMarketplaceSession({ emailAccount: { email: "broken" } }), false);
});

test("возврат после входа разрешён только в рабочие внутренние разделы", () => {
  assert.equal(sanitizeAuthReturnPath("/cart"), "/cart");
  assert.equal(sanitizeAuthReturnPath("/checkout"), "/checkout");
  assert.equal(sanitizeAuthReturnPath("/balance/top-up"), "/balance/top-up");
  assert.equal(sanitizeAuthReturnPath("/account"), "/account");
  assert.equal(sanitizeAuthReturnPath("/account/purchases"), "/account/purchases");
  assert.equal(sanitizeAuthReturnPath("/account/payments"), "/account/payments");
  assert.equal(sanitizeAuthReturnPath("/account/inventory"), "/account/inventory");
  assert.equal(sanitizeAuthReturnPath("/account/steam"), "/account/steam");
  assert.equal(sanitizeAuthReturnPath("/account/settings"), "/account/settings");
  assert.equal(sanitizeAuthReturnPath("/account/support"), "/account/support");
  assert.equal(sanitizeAuthReturnPath("/account/unknown"), null);
  assert.equal(sanitizeAuthReturnPath("https://example.com"), null);
  assert.equal(sanitizeAuthReturnPath("//example.com"), null);
});
