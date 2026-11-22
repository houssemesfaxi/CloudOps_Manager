import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";
import { ApiStatus } from "./api-status";

export const metadata = { title: "Dashboard · CloudOps Manager" };

/** Dashboard: counters and charts come with step 18. */
export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Vue d’ensemble des projets, serveurs, applications et alertes."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <ApiStatus />
        <div className="lg:col-span-2">
          <EmptyState
            title="Compteurs et graphiques à venir"
            description="Le dashboard (API et graphiques) est prévu à l’étape 18 du planning."
          />
        </div>
      </div>
    </>
  );
}
