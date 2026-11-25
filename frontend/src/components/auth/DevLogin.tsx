import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { AUTH_KEY } from "@/services/queryClient";
import { supabase } from "@/services/supabase";
import { ROLE_ADMIN, ROLE_USER, type Role } from "@/types/user";
import { errorMessage } from "@/utils/apiError";

// The dev login: one click, no password, as the test account of a role. Only
// in the Vite dev server, locally or in a Codespace: LoginPage loads this file
// only when import.meta.env.DEV is true, the mode is not production and
// VITE_DEV_LOGIN_ENABLED is "true", so it is never in a staging or production
// build; CI checks that. The backend knows the route only in its dev server
// (backend/dev/) and then sets a session cookie.

const ROLES: readonly { role: Role; label: string }[] = [
  { role: ROLE_USER, label: "Direct inloggen als Gebruiker" },
  { role: ROLE_ADMIN, label: "Direct inloggen als Beheerder" },
];

interface DevLoginProps {
  /** A sign-in is already running. */
  disabled: boolean;
  /** Like the Microsoft button: show busy, and an error in the page's message. */
  attempt: (
    run: () => Promise<void>,
    onError: (err: unknown) => string,
  ) => Promise<void>;
}

/** A line with a word in it, above the buttons. */
function Divider({ children }: { children: string }) {
  return (
    <p className="flex items-center gap-3 text-xs text-muted-foreground">
      <span aria-hidden className="h-px flex-1 bg-border" />
      {children}
      <span aria-hidden className="h-px flex-1 bg-border" />
    </p>
  );
}

export function DevLogin({ disabled, attempt }: DevLoginProps) {
  const queryClient = useQueryClient();
  const [busyAs, setBusyAs] = useState<Role | null>(null);

  async function signIn(role: Role): Promise<void> {
    // A Supabase session wins over the cookie in the backend: remove it first,
    // on this device only.
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session) await supabase.auth.signOut({ scope: "local" });
    }
    await api.post("/auth/dev-login", { role });
    await queryClient.resetQueries({ queryKey: AUTH_KEY });
  }

  async function click(role: Role): Promise<void> {
    setBusyAs(role);
    try {
      await attempt(
        () => signIn(role),
        (err) =>
          errorMessage(
            err,
            "Direct inloggen is niet gelukt. Draait de backend?",
          ),
      );
    } finally {
      setBusyAs(null);
    }
  }

  return (
    <>
      <Divider>alleen lokaal</Divider>
      {ROLES.map(({ role, label }) => (
        <Button
          key={role}
          type="button"
          variant="outline"
          className="w-full"
          loading={busyAs === role}
          disabled={disabled}
          onClick={() => void click(role)}
        >
          {label}
        </Button>
      ))}
    </>
  );
}
