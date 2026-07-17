export type CheckoutGate =
  | "empty"
  | "insufficient"
  | "auth-required"
  | "steam-required"
  | "ready";

export type CheckoutGateInput = {
  itemCount: number;
  totalCoins: number;
  balanceCoins: number;
  isAuthenticated: boolean;
  requiresSteam: boolean;
  hasSteam: boolean;
};

export function getCheckoutGate(input: CheckoutGateInput): CheckoutGate {
  if (input.itemCount <= 0) return "empty";
  if (input.balanceCoins < input.totalCoins) return "insufficient";
  if (!input.isAuthenticated) return "auth-required";
  if (input.requiresSteam && !input.hasSteam) return "steam-required";
  return "ready";
}

export function canSubmitCheckout(gate: CheckoutGate, accepted: boolean) {
  return gate === "ready" && accepted;
}
