import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { vi } from "vitest";

/**
 * A fake `supabase.auth` for tests: a session the test sets itself, and events
 * the test sends itself. No test talks to a real Supabase project. In a test:
 *
 *   vi.mock("@/services/supabase", async () => ({
 *     supabase: (await import("@/test/supabaseFake")).supabaseFake.supabase,
 *   }));
 *
 * and `supabaseFake.reset()` in beforeEach.
 */

type Listener = (event: AuthChangeEvent, session: Session | null) => void;

/** A session as Supabase returns it, for this Supabase id. */
export function fakeSession(
  authId = "6b1f5a0e-3c2d-4e8f-9a7b-1c2d3e4f5a6b",
  token = "supabase-token",
): Session {
  return {
    access_token: token,
    refresh_token: "refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: authId,
      aud: "authenticated",
      app_metadata: { provider: "azure", providers: ["azure"] },
      user_metadata: {},
      created_at: "2026-01-01T08:00:00.000Z",
    },
  };
}

function createFake() {
  const listeners = new Set<Listener>();
  let session: Session | null = null;

  function send(event: AuthChangeEvent, next: Session | null): void {
    for (const listener of listeners) listener(event, next);
  }

  const auth = {
    getSession: vi.fn(),
    refreshSession: vi.fn(),
    initialize: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
  };

  /** Back to: no session and no listeners. */
  function reset(): void {
    listeners.clear();
    session = null;
    for (const fake of Object.values(auth)) fake.mockReset();
    auth.getSession.mockImplementation(() =>
      Promise.resolve({ data: { session }, error: null }),
    );
    auth.refreshSession.mockImplementation(() =>
      Promise.resolve({
        data: { session, user: session?.user ?? null },
        error: null,
      }),
    );
    auth.initialize.mockResolvedValue({ error: null });
    auth.signInWithOAuth.mockResolvedValue({
      data: { provider: "azure", url: "https://login.microsoftonline.com" },
      error: null,
    });
    auth.signOut.mockImplementation(() => {
      session = null;
      send("SIGNED_OUT", null);
      return Promise.resolve({ error: null });
    });
    auth.onAuthStateChange.mockImplementation((listener: Listener) => {
      listeners.add(listener);
      queueMicrotask(() => {
        if (listeners.has(listener)) listener("INITIAL_SESSION", session);
      });
      return {
        data: {
          subscription: { unsubscribe: () => listeners.delete(listener) },
        },
      };
    });
  }

  reset();

  return {
    supabase: { auth },
    reset,
    send,
    /** The session Supabase has "in the browser". */
    setSession(next: Session | null): void {
      session = next;
    },
  };
}

export const supabaseFake = createFake();
