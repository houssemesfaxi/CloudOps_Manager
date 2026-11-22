"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { RoleBadge } from "@/components/auth/role-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { FormError, LoadingState } from "@/components/ui/states";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { User } from "@/types/api";

/** PATCH /users/me: first and last name. Email and role are shown, not editable. */
export function ProfileForm() {
  const { user, reload } = useAuth();

  return (
    <Card title="Informations">
      {user ? (
        // key: the form restarts from the saved values after a reload.
        <ProfileFields key={user.updatedAt} user={user} onSaved={reload} />
      ) : (
        <LoadingState />
      )}
    </Card>
  );
}

function ProfileFields({ user, onSaved }: { user: User; onSaved: () => void }) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await api.patch("/users/me", { firstName, lastName });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Email</dt>
        <dd className="break-all">{user.email}</dd>
        <dt className="text-muted-foreground">Rôle</dt>
        <dd>
          <RoleBadge role={user.role} />
        </dd>
        <dt className="text-muted-foreground">Membre depuis</dt>
        <dd>{formatDateTime(user.createdAt)}</dd>
      </dl>

      <FormError message={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="firstName" required>
          <Input
            id="firstName"
            required
            maxLength={50}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </Field>
        <Field label="Nom" htmlFor="lastName" required>
          <Input
            id="lastName"
            required
            maxLength={50}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={submitting}>
          Enregistrer
        </Button>
        {saved && <p className="text-sm text-success">Profil mis à jour</p>}
      </div>
    </form>
  );
}

/** PATCH /users/me/password */
export function PasswordForm() {
  const empty = { currentPassword: "", newPassword: "", confirm: "" };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const mismatch = form.confirm !== "" && form.confirm !== form.newPassword;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (mismatch) return;
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await api.patch("/users/me/password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm(empty);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Mot de passe">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <FormError message={error} />
        <Field label="Mot de passe actuel" htmlFor="currentPassword" required>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            value={form.currentPassword}
            onChange={(e) =>
              setForm({ ...form, currentPassword: e.target.value })
            }
          />
        </Field>
        <Field
          label="Nouveau mot de passe"
          htmlFor="newPassword"
          hint="8 caractères minimum"
          required
        >
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
          />
        </Field>
        <Field
          label="Confirmer"
          htmlFor="confirmPassword"
          error={mismatch ? "Les mots de passe ne correspondent pas" : undefined}
          required
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={mismatch}
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" loading={submitting} disabled={mismatch}>
            Changer le mot de passe
          </Button>
          {saved && (
            <p className="text-sm text-success">Mot de passe modifié</p>
          )}
        </div>
      </form>
    </Card>
  );
}
