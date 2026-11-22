import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Utilisateurs · CloudOps Manager" };

export default function Page() {
  return (
    <ComingSoon
      title="Utilisateurs"
      description="Comptes et rôles (Admin uniquement)."
      step={14}
    />
  );
}
