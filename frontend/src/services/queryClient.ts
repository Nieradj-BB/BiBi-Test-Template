import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

/** The query key of the session (`GET /auth/me`). */
export const AUTH_KEY = ["auth", "me"] as const;

/**
 * The app's QueryClient. A 401 or 403 on any request means the session may
 * have changed (expired, deactivated, role revoked): then the session is
 * checked again, which sends the routes to /login when needed. Client errors
 * (4xx) are not retried; outages are, up to three times.
 */
export function createQueryClient(): QueryClient {
  const client = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.queryKey[0] !== AUTH_KEY[0]) checkSession(error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => checkSession(error),
    }),
    defaultOptions: {
      queries: {
        retry: (attempts, error) =>
          isAxiosError(error) && error.response && error.response.status < 500
            ? false
            : attempts < 3,
      },
    },
  });

  function checkSession(error: unknown): void {
    const status = isAxiosError(error) ? error.response?.status : undefined;
    if (status === 401 || status === 403) {
      void client.invalidateQueries({ queryKey: AUTH_KEY });
    }
  }

  return client;
}
