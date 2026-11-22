import { AuthProvider } from "@/components/auth/auth-provider";
import { AuthedShell } from "@/components/auth/authed-shell";

/**
 * Layout of every page behind the login (route group "(dashboard)",
 * not part of the URL). proxy.ts already sent visitors without token to /login.
 */
export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthProvider>
      <AuthedShell>{children}</AuthedShell>
    </AuthProvider>
  );
}
