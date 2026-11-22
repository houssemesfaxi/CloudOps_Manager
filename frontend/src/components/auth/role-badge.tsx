import { Badge, type Tone } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/auth";
import type { Role } from "@/types/api";

const ROLE_TONES: Record<Role, Tone> = {
  ADMIN: "danger",
  DEVOPS: "info",
  VIEWER: "neutral",
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge tone={ROLE_TONES[role]}>{ROLE_LABELS[role]}</Badge>;
}
