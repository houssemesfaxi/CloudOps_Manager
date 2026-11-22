"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import {
  EmptyState,
  ErrorState,
  FormError,
  LoadingState,
} from "@/components/ui/states";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { useApi } from "@/hooks/use-api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { api, errorMessage } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { isAdmin } from "@/lib/permissions";
import type { Paginated, Role, User } from "@/types/api";

const ROLES: Role[] = ["ADMIN", "DEVOPS", "VIEWER"];

/** Admin only: GET /users, change role, activate/deactivate, delete. */
export function UsersList() {
  const { user: me, loading: meLoading } = useAuth();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [active, setActive] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const debouncedSearch = useDebouncedValue(search);
  const allowed = isAdmin(me?.role);

  const { data, error, loading, reload } = useApi<Paginated<User>>(
    // Do not call the API at all if the user is not an admin.
    allowed ? "/users" : null,
    {
      query: {
        page,
        limit: 10,
        search: debouncedSearch,
        role,
        isActive: active,
        sortBy: "lastName",
        order: "asc",
      },
    },
  );

  /** Runs one admin action on a user, then reloads the list. */
  async function run(userId: string, action: () => Promise<unknown>) {
    setActionError(null);
    setBusyId(userId);
    try {
      await action();
      reload();
      return true;
    } catch (err) {
      setActionError(errorMessage(err));
      return false;
    } finally {
      setBusyId(null);
    }
  }

  if (meLoading) return <LoadingState />;
  if (!allowed) {
    return (
      <>
        <PageHeader title="Utilisateurs" />
        <EmptyState
          title="Accès réservé aux administrateurs"
          description="Demandez à un administrateur de modifier votre rôle."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="Comptes, rôles et activation. Le premier compte créé est administrateur."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          type="search"
          placeholder="Nom, prénom ou email…"
          aria-label="Rechercher"
          className="max-w-xs"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select
          aria-label="Rôle"
          className="w-auto"
          value={role}
          onChange={(e) => {
            setRole(e.target.value as Role | "");
            setPage(1);
          }}
        >
          <option value="">Tous les rôles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Statut"
          className="w-auto"
          value={active}
          onChange={(e) => {
            setActive(e.target.value as "" | "true" | "false");
            setPage(1);
          }}
        >
          <option value="">Tous les comptes</option>
          <option value="true">Actifs</option>
          <option value="false">Désactivés</option>
        </Select>
      </div>

      <div className="mb-4">
        <FormError message={actionError} />
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : loading || !data ? (
        <LoadingState />
      ) : data.data.length === 0 ? (
        <EmptyState title="Aucun utilisateur ne correspond aux filtres" />
      ) : (
        <div className="flex flex-col gap-4">
          <Table>
            <THead>
              <Tr>
                <Th>Utilisateur</Th>
                <Th>Rôle</Th>
                <Th>Statut</Th>
                <Th>Inscrit le</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </THead>
            <TBody>
              {data.data.map((u) => {
                const self = u.id === me?.id;
                const busy = busyId === u.id;
                return (
                  <Tr key={u.id}>
                    <Td>
                      <p className="font-medium">
                        {u.firstName} {u.lastName}
                        {self && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (vous)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </Td>
                    <Td>
                      <Select
                        aria-label={`Rôle de ${u.firstName} ${u.lastName}`}
                        className="h-8 w-auto"
                        value={u.role}
                        disabled={self || busy}
                        title={self ? "Vous ne pouvez pas changer votre propre rôle" : undefined}
                        onChange={(e) =>
                          run(u.id, () =>
                            api.patch(`/users/${u.id}/role`, {
                              role: e.target.value,
                            }),
                          )
                        }
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </Select>
                    </Td>
                    <Td>
                      {u.isActive ? (
                        <Badge tone="success">Actif</Badge>
                      ) : (
                        <Badge tone="neutral">Désactivé</Badge>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(u.createdAt)}
                    </Td>
                    <Td className="whitespace-nowrap text-right">
                      {!self && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            loading={busy}
                            onClick={() =>
                              run(u.id, () =>
                                api.patch(`/users/${u.id}/status`, {
                                  isActive: !u.isActive,
                                }),
                              )
                            }
                          >
                            {u.isActive ? "Désactiver" : "Réactiver"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-danger"
                            disabled={busy}
                            onClick={() => setDeleting(u)}
                          >
                            Supprimer
                          </Button>
                        </>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </Table>
          <Pagination meta={data.meta} onPageChange={setPage} />
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer le compte"
        danger
        confirmLabel="Supprimer"
        loading={deleting !== null && busyId === deleting.id}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          const ok = await run(deleting.id, () =>
            api.delete(`/users/${deleting.id}`),
          );
          // On error (e.g. 409: the user created projects) the message shows above the table.
          setDeleting(null);
          if (!ok) window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        message={
          <p>
            Supprimer définitivement le compte de{" "}
            <strong>
              {deleting?.firstName} {deleting?.lastName}
            </strong>{" "}
            ? Un utilisateur qui a créé des projets ne peut pas être supprimé :
            désactivez-le plutôt.
          </p>
        }
      />
    </>
  );
}
