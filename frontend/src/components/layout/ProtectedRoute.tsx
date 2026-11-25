import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { SessionError } from "@/components/layout/SessionError";
import { useAuth } from "@/context/AuthContext";

/**
 * Only for signed-in users; everyone else goes to /login, which brings them
 * back to the page they asked for after signing in.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return null;
  if (status === "error") return <SessionError />;
  if (status !== "signedIn") {
    const from = location.pathname + location.search + location.hash;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return <>{children}</>;
}
