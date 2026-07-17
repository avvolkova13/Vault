import type { Metadata } from "next";

import { AccountScreen } from "@/features/account/AccountScreen";

export const metadata: Metadata = { title: "Steam" };

export default function SteamPage() {
  return <AccountScreen section="steam" />;
}
