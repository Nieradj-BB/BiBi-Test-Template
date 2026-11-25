import { Link, Outlet, useLocation } from "react-router-dom";

import { AppShell } from "@/components/app-shell/app-shell";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { PageError } from "@/components/layout/PageError";
import { APP_NAME } from "@/config/app";
import { NAV_ITEMS } from "@/config/navigation";
import { useAuth } from "@/context/AuthContext";

/** The start page is active only on "/", other items also on their sub-pages. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The frame of every page after sign-in: the library's AppShell with the main
 * menu, the signed-in user and sign-out. Pages render inside it through
 * `<Outlet>`; AppShell already renders `<main>`, so pages never add one.
 * A page that crashes shows `PageError` inside the shell; another page in the
 * menu resets that (the boundary is keyed on the path).
 */
export function AppLayout() {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();

  const navItems = NAV_ITEMS.map((item) => ({
    ...item,
    active: item.href ? isActive(pathname, item.href) : false,
  }));

  return (
    <AppShell
      appName={APP_NAME}
      navItems={navItems}
      user={{ name: user?.name ?? "" }}
      onSignOut={() => void signOut()}
      renderLink={({ href, ...props }) => <Link to={href} {...props} />}
    >
      <ErrorBoundary key={pathname} fallback={<PageError />}>
        <Outlet />
      </ErrorBoundary>
    </AppShell>
  );
}
