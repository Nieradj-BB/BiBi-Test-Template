import { SearchXIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContent } from "@/components/ui/page-content";
import { PageHeader } from "@/components/ui/page-header";

/** Every unknown path inside the app shell. */
export default function NotFoundPage() {
  return (
    <>
      <PageHeader title="Pagina niet gevonden" />
      <PageContent>
        <EmptyState
          icon={SearchXIcon}
          title="Deze pagina bestaat niet"
          description="Controleer het adres, of ga terug naar de startpagina."
          action={
            <Button asChild>
              <Link to="/">Naar de startpagina</Link>
            </Button>
          }
        />
      </PageContent>
    </>
  );
}
