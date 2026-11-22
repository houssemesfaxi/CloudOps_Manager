"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { FormError } from "@/components/ui/states";
import { errorMessage } from "@/lib/api";
import { register } from "@/lib/auth";

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  const mismatch = form.confirm !== "" && form.confirm !== form.password;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (mismatch) return;
    setError(null);
    setSubmitting(true);
    try {
      const { firstName, lastName, email, password } = form;
      await register({ firstName, lastName, email, password });
      router.replace("/");
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Créer un compte</h1>
        <p className="text-sm text-muted-foreground">
          Le premier compte créé devient administrateur, les suivants sont en
          lecture seule jusqu’à ce qu’un admin change leur rôle.
        </p>
      </div>

      <FormError message={error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="firstName" required>
          <Input
            id="firstName"
            autoComplete="given-name"
            required
            maxLength={50}
            value={form.firstName}
            onChange={(e) => set("firstName")(e.target.value)}
          />
        </Field>
        <Field label="Nom" htmlFor="lastName" required>
          <Input
            id="lastName"
            autoComplete="family-name"
            required
            maxLength={50}
            value={form.lastName}
            onChange={(e) => set("lastName")(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Email" htmlFor="email" required>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => set("email")(e.target.value)}
        />
      </Field>
      <Field
        label="Mot de passe"
        htmlFor="password"
        hint="8 caractères minimum"
        required
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          value={form.password}
          onChange={(e) => set("password")(e.target.value)}
        />
      </Field>
      <Field
        label="Confirmer le mot de passe"
        htmlFor="confirm"
        error={mismatch ? "Les mots de passe ne correspondent pas" : undefined}
        required
      >
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={mismatch}
          value={form.confirm}
          onChange={(e) => set("confirm")(e.target.value)}
        />
      </Field>

      <Button type="submit" loading={submitting} disabled={mismatch}>
        Créer mon compte
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-primary">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
