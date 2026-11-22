import { Suspense } from "react";
import { ProjectDetail } from "@/components/projects/project-detail";
import { LoadingState } from "@/components/ui/states";

export const metadata = { title: "Projet · CloudOps Manager" };

/**
 * The project id is only known at request time: with cacheComponents,
 * reading params must happen inside a Suspense boundary.
 */
export default function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  return (
    <Suspense fallback={<LoadingState />}>
      <ProjectFromParams params={params} />
    </Suspense>
  );
}

async function ProjectFromParams({
  params,
}: {
  params: PageProps<"/projects/[id]">["params"];
}) {
  const { id } = await params;
  return <ProjectDetail id={id} />;
}
