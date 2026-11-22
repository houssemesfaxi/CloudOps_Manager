"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useApi } from "@/hooks/use-api";
import { API_URL } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

/** Checks that the frontend reaches the backend (GET /health, public), every 30 s. */
export function ApiStatus() {
  const { data, error, loading, reload } = useApi<{
    status: string;
    timestamp: string;
  }>("/health", { refreshInterval: 30_000 });

  return (
    <Card
      title="Connexion à l’API"
      actions={
        <Button variant="ghost" size="sm" onClick={reload}>
          Tester
        </Button>
      }
    >
      <div className="flex flex-col gap-2 text-sm">
        {loading ? (
          <Spinner />
        ) : error ? (
          <>
            <Badge tone="danger">Injoignable</Badge>
            <p className="text-muted-foreground">{error.message}</p>
          </>
        ) : (
          <>
            <Badge tone="success">En ligne</Badge>
            <p className="text-muted-foreground">
              Dernière réponse : {data && formatDateTime(data.timestamp)}
            </p>
          </>
        )}
        <code className="break-all text-xs text-muted-foreground">
          {API_URL}
        </code>
      </div>
    </Card>
  );
}
