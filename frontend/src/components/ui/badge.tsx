import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type {
  AlertSeverity,
  AlertStatus,
  ApplicationStatus,
  EnvironmentType,
  ProjectStatus,
  ServerStatus,
} from "@/types/api";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  danger: "bg-danger/12 text-danger",
  info: "bg-info/12 text-info",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

type Status =
  | ServerStatus
  | ApplicationStatus
  | AlertStatus
  | AlertSeverity
  | EnvironmentType
  | ProjectStatus;

/** French label and color of every status sent by the API. */
const statuses: Record<Status, { label: string; tone: Tone }> = {
  // Servers
  ACTIVE: { label: "Actif", tone: "success" },
  STOPPED: { label: "Arrêté", tone: "neutral" },
  MAINTENANCE: { label: "Maintenance", tone: "warning" },
  OFFLINE: { label: "Hors ligne", tone: "danger" },
  // Applications
  RUNNING: { label: "En cours", tone: "success" },
  FAILED: { label: "En échec", tone: "danger" },
  // Alerts
  OPEN: { label: "Ouverte", tone: "danger" },
  ACKNOWLEDGED: { label: "Acquittée", tone: "warning" },
  RESOLVED: { label: "Résolue", tone: "success" },
  INFO: { label: "Info", tone: "info" },
  WARNING: { label: "Warning", tone: "warning" },
  CRITICAL: { label: "Critique", tone: "danger" },
  // Projects (ACTIVE is shared with servers)
  ARCHIVED: { label: "Archivé", tone: "neutral" },
  // Environments
  DEV: { label: "Dev", tone: "info" },
  STAGING: { label: "Staging", tone: "warning" },
  PROD: { label: "Prod", tone: "danger" },
};

export function StatusBadge({ status }: { status: Status }) {
  const { label, tone } = statuses[status] ?? {
    label: status,
    tone: "neutral",
  };
  return (
    <Badge tone={tone}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </Badge>
  );
}
