"use client";

import Link from "next/link";
import { Suspense, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { SidebarNav, SidebarNavFallback } from "./sidebar-nav";

/**
 * Page frame of the logged-in part: sidebar on the left (a drawer on phones),
 * top bar, and the page content.
 * userMenu: right side of the top bar (user name + logout, step 12).
 */
export function AppShell({
  children,
  userMenu,
}: {
  children: ReactNode;
  userMenu?: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const close = () => setMenuOpen(false);

  return (
    <div className="flex min-h-full flex-1">
      {/* Dark layer behind the drawer on phones */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={close}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform",
          "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-5">
          <Link href="/" onClick={close} className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              CO
            </span>
            <span className="font-semibold">CloudOps Manager</span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {/* usePathname can wait for dynamic routes (cacheComponents): Suspense keeps the shell static. */}
          <Suspense fallback={<SidebarNavFallback />}>
            <SidebarNav onNavigate={close} />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Ouvrir le menu"
            className="rounded-md p-2 hover:bg-muted lg:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              className="size-5"
              aria-hidden
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="ml-auto flex items-center gap-3">{userMenu}</div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
