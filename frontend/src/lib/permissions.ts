import type { Role } from "@/types/api";

/**
 * What the UI shows to each role (docs/01, section 4).
 * Only hides buttons: the backend checks every request anyway (403).
 */

/** Create / edit projects, environments, servers, applications. */
export function canWrite(role?: Role): boolean {
  return role === "ADMIN" || role === "DEVOPS";
}

/** Delete projects, environments, servers, applications; manage users. */
export function isAdmin(role?: Role): boolean {
  return role === "ADMIN";
}
