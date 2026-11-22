import type { Paginated } from "@/types/api";
import { Button } from "./button";

/** "12 résultats · Page 2 / 3   [Précédent] [Suivant]", from the API meta block. */
export function Pagination({
  meta,
  onPageChange,
}: {
  meta: Paginated<unknown>["meta"];
  onPageChange: (page: number) => void;
}) {
  const { total, page, totalPages } = meta;
  const pages = Math.max(totalPages, 1);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
    >
      <p>
        {total} résultat{total > 1 ? "s" : ""} · Page {page} / {pages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Précédent
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Suivant
        </Button>
      </div>
    </nav>
  );
}
