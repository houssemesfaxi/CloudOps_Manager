import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps {
  title?: ReactNode;
  description?: ReactNode;
  /** Buttons shown on the right of the title. */
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Card({
  title,
  description,
  actions,
  children,
  className,
}: CardProps) {
  return (
    <section
      className={cn("rounded-lg border border-border bg-card p-5", className)}
    >
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/** Small number card for the dashboards: "Serveurs actifs  12". */
export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
