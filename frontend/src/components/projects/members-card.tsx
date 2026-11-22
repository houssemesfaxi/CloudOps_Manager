"use client";

import { useState, type FormEvent } from "react";
import { RoleBadge } from "@/components/auth/role-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { FormError } from "@/components/ui/states";
import { useApi } from "@/hooks/use-api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { api, errorMessage } from "@/lib/api";
import { canWrite } from "@/lib/permissions";
import type {
  ProjectMember,
  ProjectRole,
  Role,
  UserSummary,
} from "@/types/api";

interface Props {
  projectId: string;
  members: ProjectMember[];
  role?: Role;
  onChange: () => void;
}

/** Team of a project (RF-PRJ-2): add and remove members. */
export function MembersCard({ projectId, members, role, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<ProjectMember | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmRemove() {
    if (!removing) return;
    setBusy(true);
    setRemoveError(null);
    try {
      await api.delete(`/projects/${projectId}/members/${removing.user.id}`);
      setRemoving(null);
      onChange();
    } catch (err) {
      setRemoveError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="Équipe"
      description={`${members.length} membre${members.length > 1 ? "s" : ""}`}
      actions={
        canWrite(role) && (
          <Button size="sm" onClick={() => setAdding(true)}>
            Ajouter
          </Button>
        )
      }
    >
      <ul className="divide-y divide-border">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
              {m.user.firstName[0]}
              {m.user.lastName[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.user.firstName} {m.user.lastName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {m.user.email}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              {m.projectRole === "OWNER" && (
                <Badge tone="warning">Propriétaire</Badge>
              )}
              <RoleBadge role={m.user.role} />
            </div>
            {canWrite(role) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-danger"
                aria-label={`Retirer ${m.user.firstName} ${m.user.lastName}`}
                onClick={() => {
                  setRemoveError(null);
                  setRemoving(m);
                }}
              >
                Retirer
              </Button>
            )}
          </li>
        ))}
      </ul>

      {adding && (
        <AddMemberModal
          projectId={projectId}
          memberIds={members.map((m) => m.user.id)}
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            onChange();
          }}
        />
      )}

      <ConfirmDialog
        open={removing !== null}
        title="Retirer du projet"
        danger
        confirmLabel="Retirer"
        loading={busy}
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
        message={
          <div className="flex flex-col gap-3">
            <p>
              Retirer{" "}
              <strong>
                {removing?.user.firstName} {removing?.user.lastName}
              </strong>{" "}
              de l’équipe ?
            </p>
            <FormError message={removeError} />
          </div>
        }
      />
    </Card>
  );
}

/** Search a user (GET /users/directory) and add them (POST /projects/:id/members). */
function AddMemberModal({
  projectId,
  memberIds,
  onClose,
  onAdded,
}: {
  projectId: string;
  memberIds: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [projectRole, setProjectRole] = useState<ProjectRole>("MEMBER");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const debouncedSearch = useDebouncedValue(search);

  const { data, loading } = useApi<UserSummary[]>("/users/directory", {
    query: { search: debouncedSearch },
  });
  const candidates = (data ?? []).filter((u) => !memberIds.includes(u.id));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/projects/${projectId}/members`, { userId, projectRole });
      onAdded();
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Ajouter un membre"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            type="submit"
            form="member-form"
            loading={submitting}
            disabled={!userId}
          >
            Ajouter
          </Button>
        </>
      }
    >
      <form id="member-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="Rechercher" htmlFor="member-search">
          <Input
            id="member-search"
            type="search"
            placeholder="Nom, prénom ou email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>

        <div
          role="listbox"
          aria-label="Utilisateurs"
          className="max-h-56 overflow-y-auto rounded-md border border-border"
        >
          {loading ? (
            <div className="flex justify-center p-4">
              <Spinner />
            </div>
          ) : candidates.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Aucun utilisateur à ajouter
            </p>
          ) : (
            candidates.map((u) => (
              <button
                key={u.id}
                type="button"
                role="option"
                aria-selected={u.id === userId}
                onClick={() => setUserId(u.id)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted ${
                  u.id === userId ? "bg-primary/10" : ""
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {u.firstName} {u.lastName}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {u.email}
                  </span>
                </span>
                <RoleBadge role={u.role} />
              </button>
            ))
          )}
        </div>

        <Field label="Rôle dans le projet" htmlFor="member-role">
          <Select
            id="member-role"
            value={projectRole}
            onChange={(e) => setProjectRole(e.target.value as ProjectRole)}
          >
            <option value="MEMBER">Membre</option>
            <option value="OWNER">Propriétaire</option>
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
