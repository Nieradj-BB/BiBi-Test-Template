import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { APP_TITLE } from "@/config/app";
import { useAuth } from "@/context/AuthContext";

/**
 * `/auth/me` failed because of an outage. That is not a sign-out: whoever was
 * signed in stays signed in. So no sign-in page, but a retry.
 */
export function SessionError() {
  const { refetchUser } = useAuth();
  const [busy, setBusy] = useState(false);

  async function retry(): Promise<void> {
    setBusy(true);
    try {
      await refetchUser();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <Alert variant="destructive" className="max-w-sm">
        <AlertDescription>
          {APP_TITLE} is even niet bereikbaar. Probeer het zo opnieuw.
        </AlertDescription>
      </Alert>
      <Button type="button" loading={busy} onClick={() => void retry()}>
        Opnieuw proberen
      </Button>
    </main>
  );
}
