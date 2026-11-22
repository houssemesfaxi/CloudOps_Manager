import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: "Applications · CloudOps Manager" };

export default function Page() {
  return (
    <ComingSoon
      title="Applications"
      description="Applications déployées sur les serveurs."
      step={15}
    />
  );
}
