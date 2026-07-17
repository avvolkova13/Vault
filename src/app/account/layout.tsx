import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AccountShell } from "@/features/account/AccountShell";

export const metadata: Metadata = {
  title: { default: "Личный кабинет — Vault", template: "%s — Vault" },
  description: "Покупки, операции Coins, Steam и настройки аккаунта Vault.",
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
