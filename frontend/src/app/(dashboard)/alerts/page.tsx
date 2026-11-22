import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Alertes · CloudOps Manager" };

export default function Page() {
  return (
    <ComingSoon
      title="Alertes"
      description="Règles de seuil et incidents."
      step={17}
    />
  );
}
