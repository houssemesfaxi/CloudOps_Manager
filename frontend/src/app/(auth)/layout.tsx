/** Layout of /login and /register: a centered card, no sidebar. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="grid size-10 place-items-center rounded-md bg-primary font-bold text-primary-foreground">
            CO
          </span>
          <span className="text-xl font-semibold">CloudOps Manager</span>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          {children}
        </div>
      </div>
    </main>
  );
}
