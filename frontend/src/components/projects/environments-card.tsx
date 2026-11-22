"use client";

import { useState, type FormEvent } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { EmptyState, FormError } from "@/components/ui/states";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { api, errorMessage } from "@/lib/api";
import { canWrite, isAdmin } from "@/lib/permissions";
import type { Environment, EnvironmentType, Role } from "@/types/api";

interface Props {
  projectId: string;
  environments: Environment[];
  role?: Role;
  /** Reloads the project after a change. */
  onChange: () => void;
}

/** Environments of a project (RF-PRJ-3): list, add, rename, delete. */
export function EnvironmentsCard({
  projectId,
  environments,
  role,
  onChange,
}: Props) {
  // undefined = closed, null = new environment, Environment = edit it.
  const [editing, setEditing] = useState<Environment | null>();
  const [deleting, setDeleting] = useState<Environment | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    setDeleteError(null);
    try {
      await api.delete(`/environments/${deleting.id}`);
      setDeleting(null);
      onChange();
    } catch (err) {
      setDeleteError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="Environnements"
      description="Dev, staging et prod du projet."
      actions={
        canWrite(role) && (
          <Button size="sm" onClick={() => setEditing(null)}>
            Ajouter
          </Button>
        )
      }
    >
      {environments.length === 0 ? (
        <EmptyState
          title="Aucun environnement"
          description="Les serveurs sont rattachés à un environnement : créez-en un d’abord."
        />
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Nom</Th>
              <Th>Type</Th>
              <Th>Serveurs</Th>
              <Th>Applications</Th>
              {canWrite(role) && <Th className="text-right">Actions</Th>}
            </Tr>
          </THead>
          <TBody>
            {environments.map((env) => (
              <Tr key={env.id}>
                <Td className="font-medium">{env.name}</Td>
                <Td>
                  <StatusBadge status={env.type} />
                </Td>
                <Td className="tabular-nums">{env._count.servers}</Td>
                <Td className="tabular-nums">{env._count.applications}</Td>
                {canWrite(role) && (
                  <Td className="whitespace-nowrap text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(env)}
                    >
                      Modifier
                    </Button>
                    {isAdmin(role) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleting(env);
                        }}
                      >
                        Supprimer
                      </Button>
                    )}
                  </Td>
                )}
              </Tr>
            ))}
          </TBody>
        </Table>
      )}

      {editing !== undefined && (
        <EnvironmentFormModal
          projectId={projectId}
          environment={editing ?? undefined}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            onChange();
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer l’environnement"
        danger
        confirmLabel="Supprimer"
        loading={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
        message={
          <div className="flex flex-col gap-3">
            <p>
              Supprimer <strong>{deleting?.name}</strong> ? Impossible tant
              qu’il contient des serveurs.
            </p>
            <FormError message={deleteError} />
          </div>
        }
      />
    </Card>
  );
}

const TYPES: { value: EnvironmentType; label: string }[] = [
  { value: "DEV", label: "Dev" },
  { value: "STAGING", label: "Staging" },
  { value: "PROD", label: "Prod" },
];

/** POST /projects/:id/environments or PATCH /environments/:id */
function EnvironmentFormModal({
  projectId,
  environment,
  onClose,
  onSaved,
}: {
  projectId: string;
  environment?: Environment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<EnvironmentType>(
    environment?.type ?? "DEV",
  );
  const [name, setName] = useState(environment?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (environment) {
        await api.patch(`/environments/${environment.id}`, { type, name });
      } else {
        await api.post(`/projects/${projectId}/environments`, { type, name });
      }
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={environment ? "Modifier l’environnement" : "Nouvel environnement"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" form="env-form" loading={submitting}>
            {environment ? "Enregistrer" : "Créer"}
          </Button>
        </>
      }
    >
      <form id="env-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="Type" htmlFor="env-type" required>
          <Select
            id="env-type"
            value={type}
            onChange={(e) => setType(e.target.value as EnvironmentType)}
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Nom"
          htmlFor="env-name"
          hint="Unique dans le projet, ex. prod-europe"
          required
        >
          <Input
            id="env-name"
            required
            maxLength={50}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
