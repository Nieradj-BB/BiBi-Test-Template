import { HouseIcon } from "lucide-react";

import type { AppShellNavItem } from "@/components/app-shell/app-shell";

/**
 * The main menu in the app shell. A new page: add its route in `App.tsx` and
 * an item here. Keep it to about seven items; second-level navigation goes in
 * tabs in the page header.
 */
export const NAV_ITEMS: Omit<AppShellNavItem, "active">[] = [
  { label: "Start", href: "/", icon: HouseIcon },
];
