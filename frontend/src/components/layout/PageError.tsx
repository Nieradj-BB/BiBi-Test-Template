import { CircleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContent } from "@/components/ui/page-content";
import { PageHeader } from "@/components/ui/page-header";

/** A page that crashed, inside the app shell: the menu keeps working. */
export function PageError() {
  return (
    <>
      <PageHeader title="Er ging iets mis" />
      <PageContent>
        <EmptyState
          icon={CircleAlertIcon}
          title="Deze pagina kon niet worden getoond"
          description="Laad de pagina opnieuw of kies een andere pagina in het menu. Gebeurt het weer, meld het dan aan een beheerder."
          action={
            <Button type="button" onClick={() => window.location.reload()}>
              Pagina opnieuw laden
            </Button>
          }
        />
      </PageContent>
    </>
  );
}
