"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/states";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDateTime } from "@/lib/format";
import { canWrite } from "@/lib/permissions";
import type { Paginated, ProjectListItem, ProjectStatus } from "@/types/api";
import { ProjectFormModal } from "./project-form-modal";

/** GET /projects with search, status, "my projects" and pagination (RF-PRJ-5). */
export function ProjectsList() {
  const router = useRouter();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "">("");
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const debouncedSearch = useDebouncedValue(search);

  const { data, error, loading, reload } = useApi<Paginated<ProjectListItem>>(
    "/projects",
    {
      query: {
        page,
        limit: 10,
        search: debouncedSearch,
        status,
        memberId: mine ? user?.id : undefined,
      },
    },
  );

  return (
    <>
      <PageHeader
        title="Projets"
        description="Projets, équipes et environnements."
        actions={
          canWrite(user?.role) && (
            <Button onClick={() => setCreating(true)}>Nouveau projet</Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          type="search"
          placeholder="Rechercher un projet…"
          aria-label="Rechercher"
          className="max-w-xs"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          aria-label="Statut"
          className="w-auto"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ProjectStatus | "");
            setPage(1);
          }}
        >
          <option value="">Tous les statuts</option>
          <option value="ACTIVE">Actifs</option>
          <option value="ARCHIVED">Archivés</option>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mine}
            onChange={(e) => {
              setMine(e.target.checked);
              setPage(1);
            }}
          />
          Mes projets
        </label>
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading || !data ? (
        <LoadingState />
      ) : data.data.length === 0 ? (
        <EmptyState
          title="Aucun projet"
          description={
            search || status || mine
              ? "Aucun projet ne correspond aux filtres."
              : "Créez un premier projet pour y ajouter des environnements et des serveurs."
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <Table>
            <THead>
              <Tr>
                <Th>Nom</Th>
                <Th>Statut</Th>
                <Th>Membres</Th>
                <Th>Environnements</Th>
                <Th>Créé par</Th>
                <Th>Créé le</Th>
              </Tr>
            </THead>
            <TBody>
              {data.data.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {p.name}
                    </Link>
                    {p.description && (
                      <p className="max-w-xs truncate text-xs text-muted-foreground">
                        {p.description}
                      </p>
                    )}
                  </Td>
                  <Td>
                    <StatusBadge status={p.status} />
                  </Td>
                  <Td className="tabular-nums">{p._count.members}</Td>
                  <Td className="tabular-nums">{p._count.environments}</Td>
                  <Td className="whitespace-nowrap">
                    {p.createdBy.firstName} {p.createdBy.lastName}
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(p.createdAt)}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          <Pagination meta={data.meta} onPageChange={setPage} />
        </div>
      )}

      {creating && (
        <ProjectFormModal
          onClose={() => setCreating(false)}
          onSaved={(p) => router.push(`/projects/${p.id}`)}
        />
      )}
    </>
  );
}
