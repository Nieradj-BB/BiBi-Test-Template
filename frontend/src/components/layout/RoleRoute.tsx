import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { SessionError } from "@/components/layout/SessionError";
import { useAuth } from "@/context/AuthContext";
import type { Role } from "@/types/user";

/**
 * Like ProtectedRoute, but only for users with this role; others go to the
 * home page. For what you get to see only: the backend checks the role itself
 * (`requireRole`).
 */
export function RoleRoute({
  role,
  children,
}: {
  role: Role;
  children: ReactNode;
}) {
  const { status, hasRole } = useAuth();

  if (status === "loading") return null;
  if (status === "error") return <SessionError />;
  if (status !== "signedIn") return <Navigate to="/login" replace />;
  if (!hasRole(role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
