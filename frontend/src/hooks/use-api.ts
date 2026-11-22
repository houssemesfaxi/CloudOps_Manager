"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch, withQuery, type Query } from "@/lib/api";

interface State<T> {
  url: string;
  data?: T;
  error?: ApiError;
}

interface Options {
  query?: Query;
  /** Refetch every N ms (polling for the monitoring pages, RF-MON-5). */
  refreshInterval?: number;
}

/**
 * Loads data from the API in a Client Component.
 *   const { data, error, loading, reload } = useApi<Paginated<Server>>("/servers", { query: { page } });
 * - path null = do not load yet.
 * - Changing path or query loads again; old data is not shown for the new query.
 * - reload() after a create/update/delete. Previous data stays visible meanwhile.
 */
export function useApi<T>(path: string | null, options: Options = {}) {
  const { query, refreshInterval } = options;
  const url = path ? withQuery(path, query) : null;
  const [state, setState] = useState<State<T>>({ url: "" });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();

    const load = () =>
      apiFetch<T>(url, { signal: controller.signal }).then(
        (data) => setState({ url, data }),
        (e: unknown) => {
          if (controller.signal.aborted) return;
          const error =
            e instanceof ApiError ? e : new ApiError(0, [String(e)]);
          // Keep the last good data for the same URL (e.g. a failed poll).
          setState((prev) => ({
            url,
            data: prev.url === url ? prev.data : undefined,
            error,
          }));
        },
      );

    void load();
    const timer = refreshInterval
      ? setInterval(() => void load(), refreshInterval)
      : undefined;
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [url, version, refreshInterval]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const current = url !== null && state.url === url;

  return {
    data: current ? state.data : undefined,
    error: current ? state.error : undefined,
    /** True until the first answer for the current URL. */
    loading: url !== null && !current,
    reload,
  };
}
