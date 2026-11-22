import type { Role, User } from "@/types/api";
import { api } from "./api";
import { setToken } from "./token";

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface RegisterBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/** Seconds left before the JWT expires (read from its "exp" claim). */
export function tokenMaxAge(token: string): number {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const { exp } = JSON.parse(atob(payload)) as { exp?: number };
    if (exp) return Math.max(exp - Math.floor(Date.now() / 1000), 0);
  } catch {
    // Not a readable JWT: fall back to the default below.
  }
  return 60 * 60;
}

function saveSession(res: AuthResponse): User {
  setToken(res.accessToken, tokenMaxAge(res.accessToken));
  return res.user;
}

export async function login(email: string, password: string): Promise<User> {
  return saveSession(
    await api.post<AuthResponse>("/auth/login", { email, password }),
  );
}

/** The very first account becomes ADMIN, the next ones VIEWER (backend rule). */
export async function register(body: RegisterBody): Promise<User> {
  return saveSession(await api.post<AuthResponse>("/auth/register", body));
}

/**
 * Where to go after login: the "next" query param set by proxy.ts,
 * only if it is a local path (no redirect to another site).
 */
export function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  DEVOPS: "DevOps",
  VIEWER: "Lecteur",
};
