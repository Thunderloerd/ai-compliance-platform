/**
 * In-memory + sessionStorage cache for API responses. Reduces refetches and makes first load after refresh feel faster.
 * Stale-while-revalidate: return cached data immediately if fresh; refetch in background when stale.
 */

const CACHE = new Map<string, { data: unknown; ts: number }>();
const STALE_MS = 60_000; // 60s; reuse for all for simplicity
const STORAGE_PREFIX = "compliance_api:";

function fromStorage(key: string): { data: unknown; ts: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { data: unknown; ts: number };
    if (typeof entry.ts !== "number" || entry.data === undefined) return null;
    return entry;
  } catch {
    return null;
  }
}

function toStorage(key: string, data: unknown, ts: number): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({ data, ts }));
  } catch {
    // ignore quota / parse errors
  }
}

export function getCached<T>(key: string): T | null {
  let entry = CACHE.get(key);
  if (!entry) {
    entry = fromStorage(key);
    if (entry) CACHE.set(key, entry);
  }
  if (!entry) return null;
  if (Date.now() - entry.ts > STALE_MS) return null;
  return entry.data as T;
}

export function setCached(key: string, data: unknown): void {
  const ts = Date.now();
  CACHE.set(key, { data, ts });
  toStorage(key, data, ts);
}

export function cacheKeyAnalytics(): string {
  return "api:analytics";
}
export function cacheKeyNotifications(): string {
  return "api:notifications";
}
export function cacheKeyViolations(severity?: string, department?: string, search?: string): string {
  return `api:violations:${severity ?? ""}:${department ?? ""}:${search ?? ""}`;
}
export function cacheKeyRules(status?: string, severity?: string): string {
  return `api:rules:${status ?? ""}:${severity ?? ""}`;
}
