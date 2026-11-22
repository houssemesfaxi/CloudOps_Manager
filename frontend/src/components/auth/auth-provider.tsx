"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useApi } from "@/hooks/use-api";
import { ApiError, setUnauthorizedHandler } from "@/lib/api";
import { clearToken } from "@/lib/token";
import type { User } from "@/types/api";

interface AuthValue {
  /** Logged-in user, undefined while loading. */
  user?: User;
  loading: boolean;
  error?: ApiError;
  /** Reloads the user after a profile change. */
  reload: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Loads the logged-in user (GET /auth/me) for every page behind the login.
 * When the API answers 401 (token expired), sends the user back to /login.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: user, error, loading, reload } = useApi<User>("/auth/me");

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      const next = window.location.pathname + window.location.search;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    });
    return () => setUnauthorizedHandler(clearToken);
  }, [router]);

  const logout = () => {
    clearToken();
    router.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, reload, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth() doit être utilisé dans <AuthProvider>");
  }
  return value;
}
