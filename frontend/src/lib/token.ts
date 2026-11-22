/**
 * The JWT is kept in a cookie (not localStorage) so that the route
 * protection (proxy.ts, step 12) can read it on the server too.
 * These helpers only run in the browser.
 */
export const TOKEN_COOKIE = "cloudops_token";

export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${TOKEN_COOKIE}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

/** maxAgeSeconds should match JWT_EXPIRES_IN on the backend (1 h by default). */
export function setToken(token: string, maxAgeSeconds = 60 * 60): void {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

export function clearToken(): void {
  document.cookie = `${TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
