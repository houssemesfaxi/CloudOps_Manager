"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, FormError, LoadingState } from "@/components/ui/states";
import { useApi } from "@/hooks/use-api";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { canWrite, isAdmin } from "@/lib/permissions";
import type { ProjectDetail as Project } from "@/types/api";
import { EnvironmentsCard } from "./environments-card";
import { MembersCard } from "./members-card";
import { ProjectFormModal } from "./project-form-modal";

/** GET /projects/:id: details, team and environments of one project. */
export function ProjectDetail({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const role = user?.role;
  const { data: project, error, loading, reload } = useApi<Project>(
    `/projects/${id}`,
  );
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function confirmDelete() {
    setBusy(true);
    setDeleteError(null);
    try {
      await api.delete(`/projects/${id}`);
      router.push("/projects");
    } catch (err) {
      setDeleteError(errorMessage(err));
      setBusy(false);
    }
  }

  if (error) {
    return (
      <>
        <BackLink />
        <ErrorState
          message={error.status === 404 ? "Ce projet n’existe pas." : error.message}
          onRetry={error.status === 404 ? undefined : reload}
        />
      </>
    );
  }
  if (loading || !project) return <LoadingState />;

  const servers = project.environments.reduce(
    (sum, e) => sum + e._count.servers,
    0,
  );
  const applications = project.environments.reduce(
    (sum, e) => sum + e._count.applications,
    0,
  );

  return (
    <>
      <BackLink />
      <PageHeader
        title={project.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={project.status} />
            <span>
              Créé par {project.createdBy.firstName}{" "}
              {project.createdBy.lastName} le{" "}
              {formatDateTime(project.createdAt)}
            </span>
          </span>
        }
        actions={
          <>
            {canWrite(role) && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Modifier
              </Button>
            )}
            {isAdmin(role) && (
              <Button
                variant="danger"
                onClick={() => {
                  setDeleteError(null);
                  setDeleting(true);
                }}
              >
                Supprimer
              </Button>
            )}
          </>
        }
      />

      {project.description && (
        <p className="-mt-2 mb-6 max-w-3xl text-sm text-muted-foreground">
          {project.description}
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Membres" value={project.members.length} />
        <StatCard label="Environnements" value={project.environments.length} />
        <StatCard label="Serveurs" value={servers} />
        <StatCard label="Applications" value={applications} />
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <EnvironmentsCard
            projectId={project.id}
            environments={project.environments}
            role={role}
            onChange={reload}
          />
        </div>
        <div className="xl:col-span-2">
          <MembersCard
            projectId={project.id}
            members={project.members}
            role={role}
            onChange={reload}
          />
        </div>
      </div>

      {editing && (
        <ProjectFormModal
          project={project}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
        />
      )}

      <ConfirmDialog
        open={deleting}
        title="Supprimer le projet"
        danger
        confirmLabel="Supprimer"
        loading={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(false)}
        message={
          <div className="flex flex-col gap-3">
            <p>
              Supprimer <strong>{project.name}</strong> avec ses environnements
              et son équipe ? Impossible tant que des serveurs y sont
              rattachés.
            </p>
            <FormError message={deleteError} />
          </div>
        }
      />
    </>
  );
}

function BackLink() {
  return (
    <Link
      href="/projects"
      className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
    >
      ← Tous les projets
    </Link>
  );
}
