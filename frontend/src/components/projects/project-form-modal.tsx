"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { FormError } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import type { ProjectDetail, ProjectStatus } from "@/types/api";

interface Props {
  /** Project to edit. Not set = create a new one. */
  project?: ProjectDetail;
  onClose: () => void;
  onSaved: (project: ProjectDetail) => void;
}

/**
 * Create (POST /projects) or edit (PATCH /projects/:id) a project.
 * Render it only while it is open: {open && <ProjectFormModal ... />}.
 */
export function ProjectFormModal({ project, onClose, onSaved }: Props) {
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(
    project?.status ?? "ACTIVE",
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const body = { name, description: description || undefined };
      const saved = project
        ? await api.patch<ProjectDetail>(`/projects/${project.id}`, {
            ...body,
            status,
          })
        : await api.post<ProjectDetail>("/projects", body);
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={project ? "Modifier le projet" : "Nouveau projet"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button type="submit" form="project-form" loading={submitting}>
            {project ? "Enregistrer" : "Créer"}
          </Button>
        </>
      }
    >
      <form id="project-form" onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="Nom" htmlFor="project-name" required>
          <Input
            id="project-name"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Description" htmlFor="project-description">
          <Textarea
            id="project-description"
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        {project && (
          <Field
            label="Statut"
            htmlFor="project-status"
            hint="Un projet archivé reste consultable."
          >
            <Select
              id="project-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            >
              <option value="ACTIVE">Actif</option>
              <option value="ARCHIVED">Archivé</option>
            </Select>
          </Field>
        )}
      </form>
    </Modal>
  );
}
