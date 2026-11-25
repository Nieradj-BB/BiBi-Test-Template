import {
  type QueryClient,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { isAuthImplicitGrantRedirectError } from "@supabase/supabase-js";
import { isAxiosError } from "axios";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { APP_TITLE } from "@/config/app";
import { api } from "@/services/api";
import { AUTH_KEY } from "@/services/queryClient";
import { supabase } from "@/services/supabase";
import { type Role, type User } from "@/types/user";
import { errorMessage } from "@/utils/apiError";
import { supabaseError } from "@/utils/supabaseError";

/**
 * Where the session stands:
 * - loading: Supabase restores the session, or `/auth/me` is still running;
 * - signedIn;
 * - signedOut: no session (401);
 * - refused: known to Supabase, but no access to the app (403 or 409), with
 *   the backend's message;
 * - error: the backend or the network fails, including a 429. That signs
 *   nobody out: a user who was signed in stays signed in.
 */
export type AuthStatus =
  "loading" | "signedIn" | "signedOut" | "refused" | "error";

interface AuthContextValue {
  status: AuthStatus;
  /** Only when signed in; otherwise `null`. */
  user: User | null;
  /** For what you get to see only; the backend checks roles itself. */
  hasRole: (role: Role) => boolean;
  /** When refused: why, in the backend's words. */
  message: string | null;
  /** Back from Microsoft with an error in the URL: what went wrong, in Dutch. */
  signInError: string | null;
  /** Is Supabase configured? Without it, Microsoft sign-in is impossible. */
  microsoftConfigured: boolean;
  refetchUser: () => Promise<unknown>;
  /**
   * Sends the browser to Microsoft; it comes back on /login. With
   * `selectAccount` Microsoft asks which account, instead of reusing the one
   * that is already signed in there.
   */
  signInWithMicrosoft: (options?: { selectAccount?: boolean }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** What `/auth/me` says. An error of the query is therefore always an outage. */
type Session =
  | { kind: "signedIn"; user: User }
  | { kind: "signedOut" }
  | { kind: "refused"; message: string };

const SIGNED_OUT: Session = { kind: "signedOut" };

const CANNOT_VERIFY = `${APP_TITLE} kon je sessie niet controleren. Log opnieuw in; lukt dat niet, meld het dan aan een beheerder.`;

const NOT_CONFIGURED = "Inloggen met Microsoft is nog niet ingericht.";

async function fetchSession(): Promise<Session> {
  try {
    const response = await api.get<{ data: User }>("/auth/me");
    return { kind: "signedIn", user: response.data.data };
  } catch (err) {
    const status = isAxiosError(err) ? err.response?.status : undefined;
    if (status === 401) {
      // `api.ts` already refreshed the token. With a Supabase session still
      // present, the backend refuses a valid token, for example because of
      // another SUPABASE_URL. That is not a sign-out, but worth a message.
      if (!supabase) return SIGNED_OUT;
      const { data } = await supabase.auth.getSession();
      return data.session
        ? { kind: "refused", message: CANNOT_VERIFY }
        : SIGNED_OUT;
    }
    // 403: no access or deactivated; 409: cannot be linked.
    if (status === 403 || status === 409) {
      return {
        kind: "refused",
        message: errorMessage(err, `Je hebt geen toegang tot ${APP_TITLE}.`),
      };
    }
    throw err;
  }
}

/**
 * Nothing of the session stays in memory. Not with queryClient.clear(): that
 * also removes the session without telling the components, and the page stays
 * signed in. So everything except the session goes, and the session is set to
 * signed out; that sends the routes to /login.
 */
async function forgetSession(queryClient: QueryClient): Promise<void> {
  queryClient.getMutationCache().clear();
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[0] !== AUTH_KEY[0],
  });
  // A running /auth/me would otherwise bring the user back after signing out.
  await queryClient.cancelQueries({ queryKey: AUTH_KEY });
  queryClient.setQueryData(AUTH_KEY, SIGNED_OUT);
}

/** What Supabase puts in the URL after a failed return. */
const ERROR_IN_URL = ["error", "error_code", "error_description"];

/** Removes the error from the URL, so a reload or bookmark does not repeat it. */
function clearErrorFromUrl(): void {
  const url = new URL(window.location.href);
  for (const name of ERROR_IN_URL) url.searchParams.delete(name);
  const hash = new URLSearchParams(url.hash.slice(1));
  if (ERROR_IN_URL.some((name) => hash.has(name))) {
    for (const name of ERROR_IN_URL) hash.delete(name);
    url.hash = hash.toString();
  }
  window.history.replaceState(window.history.state, "", url);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // Ask who is there only after Supabase restored its session. Otherwise
  // /auth/me goes without a token and the sign-in page flashes.
  const [restored, setRestored] = useState(supabase === null);
  const [signInError, setSignInError] = useState<string | null>(null);

  const { data, isPending, errorUpdateCount, refetch } = useQuery({
    queryKey: AUTH_KEY,
    queryFn: fetchSession,
    enabled: restored,
  });

  useEffect(() => {
    if (!supabase) return;
    let lastId: string | null = null;
    // Never await Supabase inside this callback: it still holds a lock then.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const id = session?.user.id ?? null;
      if (event === "INITIAL_SESSION") {
        lastId = id;
        setRestored(true);
      } else if (event === "SIGNED_IN" && id !== lastId) {
        // SIGNED_IN also fires when a tab becomes visible again. Only another
        // account (for example from another tab) asks again.
        lastId = id;
        void queryClient.resetQueries({ queryKey: AUTH_KEY });
      } else if (event === "SIGNED_OUT") {
        lastId = null;
        void forgetSession(queryClient);
      }
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  // Back from Microsoft with an error. Supabase reports that only in the
  // outcome of its own initialisation, not through onAuthStateChange.
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.initialize().then(({ error }) => {
      if (!active || !error) return;
      setSignInError(supabaseError(error));
      if (isAuthImplicitGrantRedirectError(error)) {
        console.warn("Back from Microsoft with an error:", error.details?.code);
        clearErrorFromUrl();
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // An outage keeps an earlier outcome. Without one it stays an error, also
  // while retrying: otherwise the retry button disappears.
  const status: AuthStatus = data
    ? data.kind
    : isPending && errorUpdateCount === 0
      ? "loading"
      : "error";
  const user = data?.kind === "signedIn" ? data.user : null;

  async function signInWithMicrosoft({
    selectAccount = false,
  }: { selectAccount?: boolean } = {}): Promise<void> {
    setSignInError(null);
    if (!supabase) throw new Error(NOT_CONFIGURED);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      // Without "email" Entra does not return the address, without "profile"
      // not the name.
      options: {
        scopes: "email profile",
        redirectTo: `${window.location.origin}/login`,
        ...(selectAccount && { queryParams: { prompt: "select_account" } }),
      },
    });
    if (error) throw error;
  }

  async function signOut(): Promise<void> {
    setSignInError(null);
    // The dev login cookie exists only in the dev server. Written out in full
    // (not via a shared constant) so the build provably drops this branch.
    if (
      import.meta.env.DEV &&
      import.meta.env.MODE !== "production" &&
      import.meta.env.VITE_DEV_LOGIN_ENABLED === "true"
    ) {
      try {
        await api.post("/auth/dev-logout");
      } catch {
        console.warn("Dev logout failed; the cookie expires by itself");
      }
    }
    if (supabase) {
      // This device only; another laptop stays signed in.
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) console.warn("Supabase sign-out failed");
    }
    await forgetSession(queryClient);
  }

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        hasRole: (role) => user?.roles.includes(role) ?? false,
        message: data?.kind === "refused" ? data.message : null,
        signInError,
        microsoftConfigured: supabase !== null,
        refetchUser: refetch,
        signInWithMicrosoft,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// The hook belongs with the provider; a change here reloads the page instead
// of a fast refresh, which is fine.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
