"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { useMarketplace } from "@/components/marketplace/MarketplaceProvider";
import { Breadcrumbs, Button, Container, Skeleton } from "@/components/ui/UI";
import { Icon } from "@/components/ui/Icon";
import {
  MOCK_EMAIL_CODE,
  type AuthMethod,
  type AuthReturnPath,
  validateEmail,
  validateMockCode,
} from "@/lib/auth";

import styles from "./auth.module.css";

type AuthStatus = "idle" | "loading" | "success" | "error";
type EmailStep = "email" | "code";

function gameItemsLabel(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  const noun =
    lastTwo >= 11 && lastTwo <= 14
      ? "игровых предметов"
      : last === 1
        ? "игровой предмет"
        : last >= 2 && last <= 4
          ? "игровых предмета"
          : "игровых предметов";
  return `${count} ${noun}`;
}

export function AuthScreen({
  initialMethod,
  returnTo,
  steamRequired,
}: {
  initialMethod: AuthMethod;
  returnTo: AuthReturnPath | null;
  steamRequired: boolean;
}) {
  const {
    cart,
    session,
    isHydrated,
    isAuthenticated,
    hasSteam,
    signInWithEmail,
    connectSteamDemo,
    signOut,
    notify,
  } = useMarketplace();
  const router = useRouter();
  const [method, setMethod] = useState<AuthMethod>(initialMethod);
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [emailStep, setEmailStep] = useState<EmailStep>("email");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [formError, setFormError] = useState("");
  const emailProviderAvailable = true;
  const submitLock = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const steamTabRef = useRef<HTMLButtonElement>(null);
  const emailTabRef = useRef<HTMLButtonElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);

  const skinItems = cart.filter((product) => product.kind === "skins");
  const requiresSteamNow = steamRequired || (returnTo === "/cart" && skinItems.length > 0);
  const emailError = validateEmail(email);
  const codeError = validateMockCode(code);
  const isLoading = status === "loading";

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  function selectMethod(nextMethod: AuthMethod) {
    if (isLoading) return;
    setMethod(nextMethod);
    setStatus("idle");
    setFormError("");
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextMethod: AuthMethod =
      event.key === "Home"
        ? "steam"
        : event.key === "End"
          ? "email"
          : event.key === "ArrowLeft"
            ? method === "steam" ? "email" : "steam"
            : method === "email" ? "steam" : "email";
    selectMethod(nextMethod);
    window.requestAnimationFrame(() => {
      (nextMethod === "steam" ? steamTabRef : emailTabRef).current?.focus();
    });
  }

  function changeEmail() {
    submitLock.current = false;
    setEmailStep("email");
    setCode("");
    setCodeTouched(false);
    setStatus("idle");
    setFormError("");
    window.requestAnimationFrame(() => emailRef.current?.focus());
  }

  async function finishAndReturn(targetMethod: AuthMethod) {
    setStatus("success");
    if (returnTo && (targetMethod === "steam" || !requiresSteamNow)) {
      await new Promise((resolve) => window.setTimeout(resolve, 750));
      router.replace(returnTo);
    }
  }

  async function connectSteam() {
    if (!isHydrated || hasSteam || submitLock.current) return;
    submitLock.current = true;
    setFormError("");
    setStatus("loading");

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      connectSteamDemo();
      notify("Steam-профиль подключён.");
      await finishAndReturn("steam");
    } catch {
      submitLock.current = false;
      setStatus("error");
      setFormError("Не удалось подключить Steam-профиль. Повторите ещё раз.");
    }
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (emailStep === "email") {
      setEmailTouched(true);
      if (emailError) {
        emailRef.current?.focus();
        return;
      }
      if (submitLock.current) return;
      submitLock.current = true;
      setStatus("loading");
      await new Promise((resolve) => window.setTimeout(resolve, 550));
      submitLock.current = false;
      setEmailStep("code");
      setCode(MOCK_EMAIL_CODE);
      setStatus("idle");
      window.requestAnimationFrame(() => codeRef.current?.focus());
      return;
    }

    setCodeTouched(true);
    if (codeError) {
      codeRef.current?.focus();
      return;
    }
    if (submitLock.current) return;
    submitLock.current = true;
    setStatus("loading");

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 650));
      signInWithEmail(email);
      notify("Email подтверждён.");

      if (requiresSteamNow && !hasSteam) {
        submitLock.current = false;
        setMethod("steam");
        setStatus("idle");
        notify("Email подтверждён. Для игровых предметов подключите Steam.");
      } else {
        await finishAndReturn("email");
      }
    } catch {
      submitLock.current = false;
      setStatus("error");
      setFormError("Не удалось выполнить вход. Повторите ещё раз.");
    }
  }

  function resetSession() {
    signOut();
    submitLock.current = false;
    setStatus("idle");
    setEmailStep("email");
    setEmail("");
    setCode("");
    setFormError("");
    notify("Вы вышли из аккаунта Vault.");
  }

  return (
    <main id="main-content" className={styles.page}>
      <Container>
        <Breadcrumbs items={[{ label: "Главная", href: "/" }, { label: "Вход" }]} />
        <div className={styles.pageHeading}>
          <span>Аккаунт Vault</span>
          <h1>Войти в Vault</h1>
          <p>Сохраняйте покупки и получайте игровые предметы через Steam.</p>
        </div>
        <p className={styles.demoDisclosure}>
          <strong>Безопасный вход</strong>
          Пароль Steam остаётся в Steam, а вход по Email подтверждается одноразовым кодом.
        </p>

        {!isHydrated ? (
          <div className={styles.layout} aria-label="Загрузка способов входа">
            <Skeleton className={styles.authSkeleton} />
            <Skeleton className={styles.contextSkeleton} />
          </div>
        ) : (
          <div className={styles.layout}>
            <section className={styles.authCard} aria-labelledby="auth-method-title">
              <div className={styles.cardHeading}>
                <span>Способ входа</span>
                <h2 id="auth-method-title">Выберите аккаунт</h2>
              </div>

              <div className={styles.tabs} role="tablist" aria-label="Способ авторизации">
                <button
                  ref={steamTabRef}
                  id="auth-tab-steam"
                  type="button"
                  role="tab"
                  aria-selected={method === "steam"}
                  aria-controls="auth-panel-steam"
                  tabIndex={method === "steam" ? 0 : -1}
                  data-active={method === "steam" || undefined}
                  disabled={isLoading}
                  onClick={() => selectMethod("steam")}
                  onKeyDown={handleTabKeyDown}
                >
                  <Icon name="steam" width="21" height="21" />
                  <span><strong>Steam</strong><small>Для игровых предметов</small></span>
                </button>
                <button
                  ref={emailTabRef}
                  id="auth-tab-email"
                  type="button"
                  role="tab"
                  aria-selected={method === "email"}
                  aria-controls="auth-panel-email"
                  tabIndex={method === "email" ? 0 : -1}
                  data-active={method === "email" || undefined}
                  disabled={isLoading}
                  onClick={() => selectMethod("email")}
                  onKeyDown={handleTabKeyDown}
                >
                  <span className={styles.mailMark}>@</span>
                  <span><strong>Email</strong><small>Для цифровых товаров</small></span>
                </button>
              </div>

              {status === "success" ? (
                <div className={styles.successState} role="status">
                  <span className={styles.successMark}>✓</span>
                  <div>
                    <span>Аккаунт активен</span>
                    <h2 ref={successRef} tabIndex={-1}>Вход выполнен</h2>
                    <p>{method === "steam" ? "Steam-профиль подключён." : `Email ${email.toLocaleLowerCase()} подтверждён.`}</p>
                    {returnTo ? (
                      <p className={styles.returnNote}>Возвращаем в предыдущий раздел…</p>
                    ) : (
                      <div className={styles.successActions}>
                        <Link className={styles.primaryLink} href="/catalog">Открыть каталог</Link>
                        <Link href="/cart">Перейти в корзину</Link>
                      </div>
                    )}
                  </div>
                </div>
              ) : method === "steam" ? (
                <div id="auth-panel-steam" role="tabpanel" aria-labelledby="auth-tab-steam" className={styles.panel} aria-busy={isLoading}>
                  <div className={styles.panelHeading}>
                    <span className={styles.steamMark}><Icon name="steam" width="30" height="30" /></span>
                    <div><h3>Войти через Steam</h3><p>Steam обязателен для покупки и получения игровых предметов.</p></div>
                  </div>
                  <div className={styles.trustRow}>
                    <Icon name="shield" width="21" height="21" />
                    <span><strong>Пароль остаётся в Steam</strong>Vault никогда не запрашивает и не получает пароль Steam.</span>
                  </div>
                  {hasSteam ? (
                    <div className={styles.connectedAccount}>
                      <span>Подключено</span>
                      <strong>{session?.steamAccount?.displayName}</strong>
                      <p>Steam ID: {session?.steamAccount?.steamId}</p>
                    </div>
                  ) : null}
                  {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
                  {hasSteam ? (
                    <div className={styles.connectedActions}>
                      <Link className={styles.primaryLink} href="/catalog">Открыть каталог</Link>
                      <Link href="/cart">Перейти в корзину</Link>
                    </div>
                  ) : (
                    <>
                      <Button className={styles.mainButton} type="button" disabled={isLoading} onClick={connectSteam}>
                        {isLoading ? "Подключаем Steam…" : "Войти через Steam"}
                      </Button>
                      <p className={styles.panelFootnote}>Безопасный вход через Steam. После авторизации профиль автоматически привяжется к Vault.</p>
                    </>
                  )}
                  <p className={styles.panelFootnote}>После подключения вы сможете получать игровые предметы через Steam Trade.</p>
                </div>
              ) : (
                <form id="auth-panel-email" role="tabpanel" aria-labelledby="auth-tab-email" className={styles.panel} aria-busy={isLoading} noValidate onSubmit={submitEmail}>
                  <div className={styles.panelHeading}>
                    <span className={styles.emailMark}>@</span>
                    <div><h3>Войти по Email</h3><p>Получите одноразовый код. Пароль не нужен.</p></div>
                  </div>
                  {session?.emailAccount ? (
                    <>
                      <div className={styles.connectedAccount}>
                        <span>Подтверждено</span>
                        <strong>{session.emailAccount.email}</strong>
                        <p>Email привязан к аккаунту Vault.</p>
                      </div>
                      <div className={styles.connectedActions}>
                        <Link className={styles.primaryLink} href="/catalog">Открыть каталог</Link>
                        <Link href="/cart">Перейти в корзину</Link>
                      </div>
                      <p className={styles.panelFootnote}>Выйти или сменить аккаунт можно в блоке состояния справа.</p>
                    </>
                  ) : (
                    <>
                      <div className={styles.field} data-step={emailStep}>
                        <label htmlFor="auth-email">Email</label>
                        <input
                          ref={emailRef}
                          id="auth-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          placeholder="name@example.com"
                          value={email}
                          disabled={isLoading || emailStep === "code"}
                          aria-invalid={emailTouched && !!emailError}
                          aria-describedby={`email-helper${emailTouched && emailError ? " email-error" : ""}`}
                          onBlur={() => setEmailTouched(true)}
                          onChange={(event) => setEmail(event.target.value)}
                        />
                        <p id="email-helper">На этот адрес будут приходить коды входа и уведомления о заказах.</p>
                        {emailTouched && emailError ? <p id="email-error" className={styles.fieldError} role="alert">{emailError}</p> : null}
                      </div>
                      {emailStep === "code" ? (
                        <>
                          <div className={styles.demoCode}><span>Код будет доступен после подключения почтового провайдера</span><strong>{email.toLocaleLowerCase()}</strong></div>
                          <button className={styles.changeEmailButton} type="button" disabled={isLoading} onClick={changeEmail}>
                            Изменить email
                          </button>
                          <div className={styles.field}>
                            <label htmlFor="auth-code">Код из письма</label>
                            <input
                              ref={codeRef}
                              id="auth-code"
                              name="code"
                              type="text"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              maxLength={6}
                              value={code}
                              disabled={isLoading}
                              aria-invalid={codeTouched && !!codeError}
                              aria-describedby={`code-helper${codeTouched && codeError ? " code-error" : ""}`}
                              onBlur={() => setCodeTouched(true)}
                              onChange={(event) => setCode(event.target.value)}
                            />
                            <p id="code-helper">Введите шесть цифр из письма.</p>
                            {codeTouched && codeError ? <p id="code-error" className={styles.fieldError} role="alert">{codeError}</p> : null}
                          </div>
                        </>
                      ) : null}
                      {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
                      <Button className={styles.mainButton} type="submit" disabled={isLoading || !emailProviderAvailable}>
                        {isLoading ? "Проверяем…" : !emailProviderAvailable ? "Вход по Email недоступен" : emailStep === "email" ? "Получить код" : "Подтвердить и войти"}
                      </Button>
                      <p className={styles.panelFootnote}>Вход по Email появится после подключения почтового провайдера.</p>
                    </>
                  )}
                </form>
              )}
            </section>

            <aside className={styles.contextCard} aria-labelledby="auth-context-title">
              {requiresSteamNow && !hasSteam ? (
                <div className={styles.requiredContext}>
                  <span>Требование заказа</span>
                  <h2 id="auth-context-title">Для этого заказа нужен Steam</h2>
                  <p>{returnTo === "/cart" ? "После подключения вернём вас в корзину." : "После подключения игровые предметы станут доступны к покупке."}</p>
                  {skinItems.length ? <strong>{gameItemsLabel(skinItems.length)}</strong> : null}
                </div>
              ) : (
                <>
                  <span>Возможности аккаунта</span>
                  <h2 id="auth-context-title">Зачем входить</h2>
                  <ul>
                    <li><strong>История покупок</strong><span>Заказы и доступные действия</span></li>
                    <li><strong>Баланс Coins</strong><span>Один баланс на всех страницах</span></li>
                    <li><strong>Получение предметов</strong><span>Steam и статус передачи</span></li>
                  </ul>
                </>
              )}
              {isAuthenticated ? (
                <div className={styles.sessionStatus}>
                  <span>Сессия активна</span>
                  <strong>{session?.steamAccount?.displayName ?? session?.emailAccount?.email}</strong>
                  <div>
                    <span>Email {session?.emailAccount ? "подтверждён" : "не подключён"}</span>
                    <span>Steam {session?.steamAccount ? "подключён" : "не подключён"}</span>
                  </div>
                  <button type="button" onClick={resetSession}>Выйти</button>
                </div>
              ) : <p className={styles.localNote}>Данные аккаунта защищены и используются для заказов Vault.</p>}
            </aside>
          </div>
        )}
      </Container>
    </main>
  );
}
