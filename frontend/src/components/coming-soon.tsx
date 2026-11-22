import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/states";

/** Placeholder for the pages built in later steps. */
export function ComingSoon({
  title,
  description,
  step,
}: {
  title: string;
  description: string;
  step: number;
}) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        title="Page en cours de développement"
        description={`Cette page sera ajoutée à l’étape ${step} du planning.`}
      />
    </>
  );
}
