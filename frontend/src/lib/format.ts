const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});
const time = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** "22/11/2026 17:30" */
export function formatDateTime(value: string | Date): string {
  return dateTime.format(new Date(value));
}

/** "17:30:05", for chart axes. */
export function formatTime(value: string | Date): string {
  return time.format(new Date(value));
}

/** 42.456 -> "42,5 %", null -> "—" */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;
}
