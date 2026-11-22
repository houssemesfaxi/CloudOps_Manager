"use client";

import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "./auth-provider";
import { UserMenu } from "./user-menu";

/** AppShell with the user menu, and the sidebar filtered by role. */
export function AuthedShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <AppShell userMenu={<UserMenu />} role={user?.role}>
      {children}
    </AppShell>
  );
}
