"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { catalogProducts } from "@/data/products";
import { demoOrders, demoTransactions } from "@/data/account";
import {
  createCheckoutRecords,
  createTopUpTransaction,
  normalizeOrders,
  normalizeSteamTradeUrl,
  normalizeTransactions,
} from "@/lib/account";
import {
  connectAuthAccount,
  createMockEmailUser,
  createMockSteamUser,
  isMarketplaceSession,
  type MarketplaceSession,
} from "@/lib/auth";
import {
  createCheckoutLock,
  getCartSummary,
  normalizeCartIds,
  resolveCartProducts,
} from "@/lib/cart";
import { getCartNotice } from "@/lib/marketplace";
import type { Product } from "@/types/commerce";
import type { CoinTransaction, MarketplaceOrder, TradeEvent } from "@/types/account";

export type CartItemInput = { id: string; title?: string };
export type CheckoutResult =
  | { status: "empty" | "insufficient" | "auth-required" | "steam-required" | "busy" }
  | {
      status: "success";
      orderNumber: string;
      itemCount: number;
      totalCoins: number;
      remainingCoins: number;
    };

const STORAGE_KEY = "vault-marketplace-state-v3";
const V2_STORAGE_KEY = "vault-marketplace-state-v2";
const LEGACY_STORAGE_KEY = "vault-marketplace-state-v1";

type StoredMarketplaceState = {
  version: 3;
  cartIds: string[];
  balanceCoins: number;
  session: MarketplaceSession | null;
  orders: MarketplaceOrder[];
  transactions: CoinTransaction[];
  tradeEvents: TradeEvent[];
  steamTradeUrl: string;
};

type MarketplaceContextValue = {
  cart: Product[];
  balanceCoins: number;
  cartTotalCoins: number;
  cartShortfallCoins: number;
  hasSufficientBalance: boolean;
  requiresSteam: boolean;
  canPurchase: boolean;
  orders: MarketplaceOrder[];
  transactions: CoinTransaction[];
  tradeEvents: TradeEvent[];
  steamTradeUrl: string;
  session: MarketplaceSession | null;
  isAuthenticated: boolean;
  hasSteam: boolean;
  isHydrated: boolean;
  addToCart: (item: CartItemInput) => void;
  removeFromCart: (id: string) => void;
  creditCoins: (amount: number) => void;
  checkoutCart: () => CheckoutResult;
  signInWithEmail: (email: string) => void;
  connectSteamDemo: () => void;
  saveSteamTradeUrl: (value: string) => void;
  signOut: () => void;
  notice: string;
  clearNotice: () => void;
  notify: (message: string) => void;
  requestSale: (item: { id: string; title: string; orderNumber?: string }) => void;
  requestWithdrawal: (item: { id: string; title: string; orderNumber?: string }) => void;
};

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

export function MarketplaceProvider({ children }: { children: ReactNode }) {
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [balanceCoins, setBalanceCoins] = useState(0);
  const [session, setSession] = useState<MarketplaceSession | null>(null);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [tradeEvents, setTradeEvents] = useState<TradeEvent[]>([]);
  const [steamTradeUrl, setSteamTradeUrl] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);
  const [notice, setNotice] = useState("");
  const checkoutLock = useRef(createCheckoutLock());

  useEffect(() => {
    let validCartIds: string[] = [];
    let validBalance = 0;
    let validSession: MarketplaceSession | null = null;
    let validOrders = demoOrders;
    let validTransactions = demoTransactions;
    let validTradeEvents: TradeEvent[] = [];
    let validTradeUrl = "";

    try {
      const rawState =
        window.localStorage.getItem(STORAGE_KEY) ??
        window.localStorage.getItem(V2_STORAGE_KEY) ??
        window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (rawState) {
        const stored = JSON.parse(rawState) as Partial<StoredMarketplaceState>;
        validCartIds = Array.isArray(stored.cartIds)
          ? normalizeCartIds(stored.cartIds, catalogProducts)
          : [];
        validBalance =
          typeof stored.balanceCoins === "number" && Number.isFinite(stored.balanceCoins)
            ? Math.max(0, Math.floor(stored.balanceCoins))
            : 0;
        validSession = isMarketplaceSession(stored.session) ? stored.session : null;
        if (stored.version === 3) {
          validOrders = Array.isArray(stored.orders) ? normalizeOrders(stored.orders) : demoOrders;
          validTransactions = Array.isArray(stored.transactions)
            ? normalizeTransactions(stored.transactions)
            : demoTransactions;
          validTradeUrl = normalizeSteamTradeUrl(stored.steamTradeUrl);
          validTradeEvents = Array.isArray(stored.tradeEvents)
            ? stored.tradeEvents.filter((event): event is TradeEvent => (
              !!event && typeof event === "object" &&
              typeof event.id === "string" &&
              typeof event.createdAt === "string" &&
              (event.direction === "purchase" || event.direction === "sale" || event.direction === "withdrawal") &&
              typeof event.title === "string" &&
              (event.status === "completed" || event.status === "processing" || event.status === "pending")
            ))
            : [];
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }

    if (!validTradeEvents.length) {
      validTradeEvents = validOrders.flatMap((order) => order.items
        .filter((item) => item.kind === "skins")
        .map((item) => ({
          id: `${order.id}-trade-${item.id}`,
          createdAt: order.createdAt,
          direction: "purchase" as const,
          title: item.title,
          orderNumber: order.number,
          status: order.status === "completed" ? "completed" as const : "processing" as const,
        })));
    }

    const hydrationTask = window.setTimeout(() => {
      setCartIds(validCartIds);
      setBalanceCoins(validBalance);
      setSession(validSession);
      setOrders(validOrders);
      setTransactions(validTransactions);
      setTradeEvents(validTradeEvents);
      setSteamTradeUrl(validTradeUrl);
      setIsHydrated(true);
    }, 0);

    return () => window.clearTimeout(hydrationTask);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const state: StoredMarketplaceState = {
      version: 3,
      cartIds,
      balanceCoins,
      session,
      orders,
      transactions,
      tradeEvents,
      steamTradeUrl,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [balanceCoins, cartIds, isHydrated, orders, session, steamTradeUrl, tradeEvents, transactions]);

  const cart = useMemo(
    () => resolveCartProducts(catalogProducts, cartIds),
    [cartIds],
  );
  const cartSummary = useMemo(
    () => getCartSummary(cart, balanceCoins),
    [balanceCoins, cart],
  );
  const isAuthenticated = !!(session?.emailAccount || session?.steamAccount);
  const hasSteam = !!session?.steamAccount;
  const requiresSteam = cart.some((product) => product.kind === "skins");
  const canPurchase =
    cartSummary.canPurchase && isAuthenticated && (!requiresSteam || hasSteam);

  const value = useMemo<MarketplaceContextValue>(
    () => ({
      cart,
      balanceCoins,
      cartTotalCoins: cartSummary.totalCoins,
      cartShortfallCoins: cartSummary.shortfallCoins,
      hasSufficientBalance: cartSummary.canPurchase,
      requiresSteam,
      canPurchase,
      orders,
      transactions,
      tradeEvents,
      steamTradeUrl,
      session,
      isAuthenticated,
      hasSteam,
      isHydrated,
      notice,
      addToCart(item) {
        const product = catalogProducts.find((entry) => entry.id === item.id);
        if (!product) return;
        checkoutLock.current.reset();
        setCartIds((current) =>
          current.includes(item.id) ? current : [...current, item.id],
        );
        setNotice(getCartNotice(product.title));
      },
      removeFromCart(id) {
        setCartIds((current) => current.filter((itemId) => itemId !== id));
      },
      creditCoins(amount) {
        const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
        if (!safeAmount) return;
        const nextBalance = balanceCoins + safeAmount;
        setBalanceCoins(nextBalance);
        setTransactions((current) => [
          createTopUpTransaction(safeAmount, nextBalance),
          ...current,
        ]);
      },
      checkoutCart() {
        if (!cart.length) return { status: "empty" };
        if (!cartSummary.canPurchase) {
          return { status: "insufficient" };
        }
        if (!isAuthenticated) return { status: "auth-required" };
        if (requiresSteam && !hasSteam) return { status: "steam-required" };
        if (!checkoutLock.current.acquire()) return { status: "busy" };

        const records = createCheckoutRecords(cart, cartSummary.remainingCoins);
        const orderNumber = records.order.number;
        setBalanceCoins((current) => Math.max(0, current - cartSummary.totalCoins));
        setCartIds([]);
        setOrders((current) => [records.order, ...current]);
        setTransactions((current) => [records.transaction, ...current]);
        setTradeEvents((current) => [
          ...cart.filter((product) => product.kind === "skins").map((product) => ({
            id: `${records.order.id}-trade-${product.id}`,
            createdAt: records.order.createdAt,
            direction: "purchase" as const,
            title: product.title,
            orderNumber,
            status: "processing" as const,
          })),
          ...current,
        ]);
        return {
          status: "success",
          orderNumber,
          itemCount: cart.length,
          totalCoins: cartSummary.totalCoins,
          remainingCoins: cartSummary.remainingCoins,
        };
      },
      signInWithEmail(email) {
        checkoutLock.current.reset();
        setSession((current) => connectAuthAccount(current, createMockEmailUser(email)));
      },
      connectSteamDemo() {
        checkoutLock.current.reset();
        setSession((current) => connectAuthAccount(current, createMockSteamUser()));
      },
      saveSteamTradeUrl(value) {
        const normalized = normalizeSteamTradeUrl(value);
        if (!normalized) return;
        setSteamTradeUrl(normalized);
      },
      signOut() {
        setSession(null);
      },
      requestSale(item) {
        const event: TradeEvent = {
          id: `sale-${item.id}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          direction: "sale",
          title: item.title,
          orderNumber: item.orderNumber,
          status: "processing",
        };
        setTradeEvents((current) => [event, ...current]);
        setNotice(`Заявка на продажу «${item.title}» создана.`);
      },
      requestWithdrawal(item) {
        const event: TradeEvent = {
          id: `withdrawal-${item.id}-${Date.now()}`,
          createdAt: new Date().toISOString(),
          direction: "withdrawal",
          title: item.title,
          orderNumber: item.orderNumber,
          status: "processing",
        };
        setTradeEvents((current) => [event, ...current]);
        setNotice(`Вывод «${item.title}» в Steam запрошен.`);
      },
      clearNotice() {
        setNotice("");
      },
      notify(message) {
        setNotice(message);
      },
    }),
    [
      balanceCoins,
      canPurchase,
      cart,
      cartSummary,
      hasSteam,
      isAuthenticated,
      isHydrated,
      notice,
      orders,
      requiresSteam,
      session,
      steamTradeUrl,
      transactions,
      tradeEvents,
    ],
  );

  return (
    <MarketplaceContext.Provider value={value}>
      {children}
      {notice ? (
        <div className="marketplace-toast" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Закрыть уведомление">
            Закрыть
          </button>
        </div>
      ) : null}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  const value = useContext(MarketplaceContext);
  if (!value) {
    throw new Error("useMarketplace must be used inside MarketplaceProvider");
  }
  return value;
}
