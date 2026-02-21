"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAnalytics, fetchViolations, fetchRules, fetchNotifications, emptyAnalytics } from "@/api";
import {
  getCached,
  getCachedStale,
  setCached,
  cacheKeyAnalytics,
  cacheKeyNotifications,
  cacheKeyViolations,
  cacheKeyRules,
} from "@/lib/api-cache";
import type { Analytics, Violation, Rule, NotificationItem } from "@/types";

// --- Analytics (dashboard, reports) ---
export function useAnalytics(): {
  data: Analytics | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const cacheKey = cacheKeyAnalytics();
  const fresh = getCached<Analytics>(cacheKey);
  const stale = getCachedStale<Analytics>(cacheKey);
  const initial = fresh ?? stale ?? null;
  const [data, setData] = useState<Analytics | null>(() => initial);
  const [isLoading, setIsLoading] = useState(!initial);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(
    async (showLoading: boolean) => {
      if (showLoading) setIsLoading(true);
      setError(null);
      try {
        const d = await fetchAnalytics();
        setData(d);
        setCached(cacheKey, d);
      } catch (e) {
        const isNetworkError =
          e instanceof Error && (e.message === "Failed to fetch" || e.name === "TypeError");
        if (isNetworkError) {
          setData(emptyAnalytics);
          setCached(cacheKey, emptyAnalytics);
          setError(null);
        } else {
          setError(e instanceof Error ? e : new Error("Failed to load analytics"));
        }
      } finally {
        setIsLoading(false);
      }
    },
    [cacheKey]
  );

  useEffect(() => {
    const hasFresh = getCached<Analytics>(cacheKey) != null;
    if (!hasFresh) load(initial === null);
  }, [cacheKey, load]);

  return { data, isLoading, error, refetch: () => load(true) };
}

// --- Notifications ---
export function useNotifications(): {
  data: NotificationItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const cacheKey = cacheKeyNotifications();
  const fresh = getCached<NotificationItem[]>(cacheKey);
  const stale = getCachedStale<NotificationItem[]>(cacheKey);
  const initial = fresh ?? stale ?? null;
  const [data, setData] = useState<NotificationItem[]>(() => initial ?? []);
  const [isLoading, setIsLoading] = useState(initial === null);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(
    async (showLoading: boolean) => {
      if (showLoading) setIsLoading(true);
      setError(null);
      try {
        const d = await fetchNotifications();
        setData(d);
        setCached(cacheKey, d);
      } catch (e) {
        setError(e instanceof Error ? e : new Error("Failed to load notifications"));
      } finally {
        setIsLoading(false);
      }
    },
    [cacheKey]
  );

  useEffect(() => {
    const hasFresh = getCached<NotificationItem[]>(cacheKey) != null;
    if (!hasFresh) load(initial === null);
  }, [cacheKey, load]);

  return { data, isLoading, error, refetch: () => load(true) };
}

// --- Violations ---
export function useViolations(params?: {
  severity?: string;
  department?: string;
  search?: string;
}): {
  data: Violation[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const severity = params?.severity;
  const department = params?.department;
  const search = params?.search;
  const cacheKey = cacheKeyViolations(severity, department, search);
  const fresh = getCached<Violation[]>(cacheKey);
  const stale = getCachedStale<Violation[]>(cacheKey);
  const initial = fresh ?? stale ?? null;
  const [data, setData] = useState<Violation[]>(() => initial ?? []);
  const [isLoading, setIsLoading] = useState(initial === null);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(
    async (showLoading: boolean) => {
      if (showLoading) setIsLoading(true);
      setError(null);
      try {
        const d = await fetchViolations({ severity, department, search });
        setData(d);
        setCached(cacheKey, d);
      } catch (e) {
        setError(e instanceof Error ? e : new Error("Failed to load violations"));
      } finally {
        setIsLoading(false);
      }
    },
    [severity, department, search, cacheKey]
  );

  useEffect(() => {
    const hasFresh = getCached<Violation[]>(cacheKey) != null;
    if (!hasFresh) load(initial === null);
  }, [cacheKey, load]);

  return { data, isLoading, error, refetch: () => load(true) };
}

// --- Rules ---
export function useRules(params?: { status?: string; severity?: string }): {
  data: Rule[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const status = params?.status;
  const severity = params?.severity;
  const cacheKey = cacheKeyRules(status, severity);
  const fresh = getCached<Rule[]>(cacheKey);
  const stale = getCachedStale<Rule[]>(cacheKey);
  const initial = fresh ?? stale ?? null;
  const [data, setData] = useState<Rule[]>(() => initial ?? []);
  const [isLoading, setIsLoading] = useState(initial === null);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(
    async (showLoading: boolean) => {
      if (showLoading) setIsLoading(true);
      setError(null);
      try {
        const d = await fetchRules({ status, severity });
        setData(d);
        setCached(cacheKey, d);
      } catch (e) {
        setError(e instanceof Error ? e : new Error("Failed to load rules"));
      } finally {
        setIsLoading(false);
      }
    },
    [status, severity, cacheKey]
  );

  useEffect(() => {
    const hasFresh = getCached<Rule[]>(cacheKey) != null;
    if (!hasFresh) load(initial === null);
  }, [cacheKey, load]);

  return { data, isLoading, error, refetch: () => load(true) };
}
