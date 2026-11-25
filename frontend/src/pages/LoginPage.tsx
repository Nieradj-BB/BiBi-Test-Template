import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { APP_NAME, APP_TITLE } from "@/config/app";
import { useAuth } from "@/context/AuthContext";
import {
  readReturnPath,
  rememberReturnPath,
  safePath,
} from "@/utils/returnPath";
import { supabaseError } from "@/utils/supabaseError";

// Loaded only in the Vite dev server with the dev login on. Written out in full
// so a build provably drops the import; CI greps dist/ to check.
const DevLogin =
  import.meta.env.DEV &&
  import.meta.env.MODE !== "production" &&
  import.meta.env.VITE_DEV_LOGIN_ENABLED === "true"
    ? lazy(() =>
        import("@/components/auth/DevLogin").then((module) => ({
          default: module.DevLogin,
        })),
      )
    : null;

type Action = "microsoft" | "dev";

const OUTAGE = `${APP_TITLE} is even niet bereikbaar. Probeer het zo opnieuw.`;

/**
 * The sign-in page, without the app shell: there is no user and no menu yet.
 * After signing in the user returns to the page they asked for: from the
 * route state (ProtectedRoute), or after the round trip through Microsoft
 * from session storage.
 */
export default function LoginPage() {
  const {
    status,
    message,
    signInError,
    microsoftConfigured,
    signInWithMicrosoft,
    signOut,
  } = useAuth();
  const location = useLocation();
  const [target] = useState(() => {
    const state: unknown = location.state;
    const from =
      typeof state === "object" && state !== null && "from" in state
        ? safePath(state.from)
        : null;
    return from ?? readReturnPath() ?? "/";
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Action | null>(null);

  // The return path has been used: a later visit to /login starts fresh.
  useEffect(() => {
    if (status === "signedIn") rememberReturnPath(null);
  }, [status]);

  if (status === "signedIn") {
    return <Navigate to={target} replace />;
  }

  // Refused: signed in with Microsoft, but without access. Signing in again
  // would reuse the same account, so sign out and let Microsoft ask.
  const switchAccount = status === "refused";

  async function microsoft(): Promise<void> {
    setError(null);
    setBusy("microsoft");
    rememberReturnPath(target);
    try {
      if (switchAccount) await signOut();
      // Success: the browser goes to Microsoft; the button stays busy.
      await signInWithMicrosoft({ selectAccount: switchAccount });
    } catch (err) {
      setError(supabaseError(err));
      setBusy(null);
    }
  }

  async function attemptDev(
    run: () => Promise<void>,
    onError: (err: unknown) => string,
  ): Promise<void> {
    setError(null);
    setBusy("dev");
    try {
      await run();
    } catch (err) {
      setError(onError(err));
    } finally {
      setBusy(null);
    }
  }

  const shown =
    error ??
    signInError ??
    (status === "refused" ? message : status === "error" ? OUTAGE : null);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card variant="elevated" className="max-w-sm">
        <CardHeader>
          {/* The same wordmark as in the app shell. */}
          <h1 className="text-2xl">
            Blue Bricks <span className="text-brand-cyan">{APP_NAME}</span>
          </h1>
          <CardDescription>Log in met je Microsoft-account.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Off while loading: right after Microsoft, Supabase is still
              exchanging the code. Off without Supabase: not possible yet. */}
          <Button
            type="button"
            className="w-full"
            loading={busy === "microsoft"}
            disabled={
              !microsoftConfigured || busy !== null || status === "loading"
            }
            onClick={() => void microsoft()}
          >
            {switchAccount
              ? "Inloggen met een ander account"
              : "Inloggen met Microsoft"}
          </Button>

          {!microsoftConfigured && (
            <Alert>
              <AlertDescription>
                Inloggen met Microsoft is nog niet ingericht.
              </AlertDescription>
            </Alert>
          )}

          {shown && (
            <Alert variant="destructive">
              <AlertDescription>{shown}</AlertDescription>
            </Alert>
          )}

          {DevLogin && (
            <Suspense fallback={null}>
              <DevLogin disabled={busy !== null} attempt={attemptDev} />
            </Suspense>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
