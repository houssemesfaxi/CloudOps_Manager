import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Monitoring · CloudOps Manager" };

export default function Page() {
  return (
    <ComingSoon
      title="Monitoring"
      description="Usage CPU/RAM et disponibilité des serveurs."
      step={17}
    />
  );
}
