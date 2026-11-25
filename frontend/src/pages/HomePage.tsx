import { LayoutDashboardIcon } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import { PageContent } from "@/components/ui/page-content";
import { PageHeader } from "@/components/ui/page-header";
import { APP_TITLE } from "@/config/app";
import { useAuth } from "@/context/AuthContext";

/**
 * The start page, and the pattern for every page inside the app shell: a
 * PageHeader with the page's only h1, then everything in PageContent (use
 * PageSection per titled block). Replace the empty state with the app's
 * overview once there is something to show.
 */
export default function HomePage() {
  const { user } = useAuth();
  const firstName = user?.name.trim().split(/\s+/)[0] ?? "";

  return (
    <>
      <PageHeader
        title={firstName ? `Welkom, ${firstName}` : "Welkom"}
        subtitle={`Je bent ingelogd bij ${APP_TITLE}.`}
      />
      <PageContent>
        <EmptyState
          icon={LayoutDashboardIcon}
          title="Nog niets te zien"
          description="Hier komt straks het overzicht van de app."
        />
      </PageContent>
    </>
  );
}
