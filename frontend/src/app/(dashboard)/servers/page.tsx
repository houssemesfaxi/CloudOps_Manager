import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Serveurs · CloudOps Manager" };

export default function Page() {
  return (
    <ComingSoon
      title="Serveurs"
      description="Serveurs VPS/VM, fournisseurs, régions et statuts."
      step={13}
    />
  );
}
