import type { ApiErrorBody } from "@/types/api";
import { clearToken, getToken } from "./token";

/** Base URL of the NestJS API, with the /api/v1 prefix. */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

/** Error thrown by every API call. status 0 = the API could not be reached. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly messages: string[],
  ) {
    super(messages.join(" · "));
    this.name = "ApiError";
  }
}

export type QueryValue = string | number | boolean | null | undefined;
export type Query = Record<string, QueryValue>;

/** { page: 1, search: "" } -> "page=1" (empty values are skipped). */
export function toQueryString(query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

/** "/servers" + { page: 2 } -> "/servers?page=2" */
export function withQuery(path: string, query?: Query): string {
  const qs = toQueryString(query);
  return qs ? `${path}?${qs}` : path;
}

/**
 * What to do when the API answers 401 (missing or expired token).
 * Default: forget the token. The auth UI (step 12) replaces it with a
 * handler that also sends the user to /login with the Next.js router.
 */
let onUnauthorized: () => void = clearToken;
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
  signal?: AbortSignal;
}

/**
 * Calls the API with the JWT and returns the JSON body.
 * Errors follow the backend format { statusCode, message, error } (docs/03).
 */
export async function apiFetch<T>(
  path: string,
  { method = "GET", body, query, signal }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${withQuery(path, query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      cache: "no-store",
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new ApiError(0, ["Impossible de joindre l’API. Est-elle démarrée ?"]);
  }

  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    const err = data as Partial<ApiErrorBody> | null;
    const message = err?.message ?? res.statusText ?? "Erreur inconnue";
    throw new ApiError(
      res.status,
      Array.isArray(message) ? message : [message],
    );
  }
  return data as T;
}

/** Shortcuts: api.get("/servers", { page: 1 }), api.post("/servers", body)... */
export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    apiFetch<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body }),
  delete: (path: string) => apiFetch<void>(path, { method: "DELETE" }),
};

/** Turns any thrown value into a message for the UI. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Erreur inconnue";
}
