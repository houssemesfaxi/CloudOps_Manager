import { AppShell } from "@/components/layout/app-shell";

/**
 * Layout of every page behind the login (route group "(dashboard)",
 * not part of the URL). Route protection and user menu: step 12.
 */
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
