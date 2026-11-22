import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Projets · CloudOps Manager" };

export default function Page() {
  return (
    <ComingSoon
      title="Projets"
      description="Projets, équipes et environnements."
      step={14}
    />
  );
}
