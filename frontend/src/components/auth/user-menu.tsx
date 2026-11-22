"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "./auth-provider";
import { RoleBadge } from "./role-badge";

/** Right side of the top bar: name, role, profile link, logout. */
export function UserMenu() {
  const { user, loading, logout } = useAuth();

  if (loading) return <Spinner className="size-4 text-muted-foreground" />;
  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/profile"
        className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted"
        title="Mon profil"
      >
        <span className="grid size-8 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
          {user.firstName[0]}
          {user.lastName[0]}
        </span>
        <span className="hidden text-sm font-medium sm:inline">
          {user.firstName} {user.lastName}
        </span>
      </Link>
      <span className="hidden sm:inline">
        <RoleBadge role={user.role} />
      </span>
      <Button variant="ghost" size="sm" onClick={logout}>
        Déconnexion
      </Button>
    </div>
  );
}
