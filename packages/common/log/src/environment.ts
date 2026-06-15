//
// Copyright 2026 DXOS.org
//

/**
 * Per-tab session-storage key used to stabilize the random suffix for the main thread.
 * `sessionStorage` is per-tab and survives reloads of the same tab.
 */
const TAB_SUFFIX_STORAGE_KEY = '@dxos/log:env-suffix';

const SUFFIX_LENGTH = 6;

/**
 * Generate a 6-character lowercase-alphanumeric suffix.
 * Cryptographically random when `crypto` is available; falls back to `Math.random`.
 */
const randomSuffix = (): string => {
  const cryptoRef = (globalThis as any).crypto as Crypto | undefined;
  if (cryptoRef?.getRandomValues) {
    const bytes = new Uint8Array(SUFFIX_LENGTH);
    cryptoRef.getRandomValues(bytes);
    // Each byte mod 36 maps to one base-36 char; mild modulo bias is acceptable for IDs.
    let suffix = '';
    for (const byte of bytes) {
      suffix += (byte % 36).toString(36);
    }
    return suffix;
  }
  return Math.random()
    .toString(36)
    .slice(2, 2 + SUFFIX_LENGTH)
    .padEnd(SUFFIX_LENGTH, '0');
};

/**
 * Look up (or create) a stable per-tab suffix in `sessionStorage`.
 * Same browser tab keeps the same suffix across reloads; different tabs get
 * different suffixes; private/blocked storage falls back to a fresh random.
 */
const getOrCreateTabSuffix = (session: Storage | undefined): string => {
  if (!session) {
    return randomSuffix();
  }
  try {
    const existing = session.getItem(TAB_SUFFIX_STORAGE_KEY);
    if (existing && existing.length > 0) {
      return existing;
    }
    const suffix = randomSuffix();
    session.setItem(TAB_SUFFIX_STORAGE_KEY, suffix);
    return suffix;
  } catch {
    return randomSuffix();
  }
};

const isInstanceOf = (scope: unknown, ctorName: string): boolean => {
  const ctor = (scope as any)?.[ctorName];
  return typeof ctor === 'function' && scope instanceof ctor;
};

/**
 * Cloudflare Workers set `navigator.userAgent` to this exact string, regardless of
 * whether the worker is using modules or service-worker syntax. This is the most
 * stable signal and is checked before browser worker scopes because CF workers in
 * service-worker syntax also expose a `ServiceWorkerGlobalScope`.
 */
const CF_WORKER_USER_AGENT = 'Cloudflare-Workers';

/**
 * Options for {@link inferEnvironmentName}.
 * Tests pass a custom `scope` to simulate worker / window globals.
 */
export type InferEnvironmentNameOptions = {
  scope?: unknown;
};

/**
 * Infer a writer/environment identifier from the current execution context.
 *
 * Safe to invoke in any JS runtime — never throws. Falls back to `unknown::<suffix>`
 * when the runtime can't be classified.
 *
 * Format is always three colon-separated segments: `<scope>:<name>:<suffix>`.
 * - `scope` — `tab | dedicated-worker | shared-worker | service-worker | cf-worker | node | unknown`.
 * - `name` — `location.origin` for tabs, `self.name` for browser workers, `process.pid`
 *   for node, empty for cf-workers / service workers / anonymous workers.
 *   Note that `name` may itself contain `:` (e.g. `http://localhost:5173`); when parsing,
 *   take the first segment as scope and the last as suffix, and treat everything in
 *   between as the name.
 * - `suffix` — 6-char random; stable per-tab via `sessionStorage`, fresh per worker / process instance.
 */
export const inferEnvironmentName = (options: InferEnvironmentNameOptions = {}): string => {
  const scope: any = options.scope ?? globalThis;

  // Cloudflare Workers — checked first because in service-worker syntax mode CF
  // workers also report as `ServiceWorkerGlobalScope`.
  if (scope.navigator?.userAgent === CF_WORKER_USER_AGENT) {
    return `cf-worker::${randomSuffix()}`;
  }

  if (isInstanceOf(scope, 'SharedWorkerGlobalScope')) {
    return `shared-worker:${scope.name ?? ''}:${randomSuffix()}`;
  }

  if (isInstanceOf(scope, 'ServiceWorkerGlobalScope')) {
    return `service-worker::${randomSuffix()}`;
  }

  if (isInstanceOf(scope, 'DedicatedWorkerGlobalScope')) {
    return `dedicated-worker:${scope.name ?? ''}:${randomSuffix()}`;
  }

  if (scope.window !== undefined && scope.window === scope) {
    const origin = scope.location?.origin ?? '';
    return `tab:${origin}:${getOrCreateTabSuffix(scope.sessionStorage)}`;
  }

  // Node.js — `process.versions.node` is the canonical signal.
  // Avoid touching the real `process` global directly so tests passing `scope: {}`
  // can opt out of node detection.
  const proc = scope.process;
  if (proc && typeof proc === 'object' && proc.versions?.node) {
    const pid = typeof proc.pid === 'number' ? String(proc.pid) : '';
    return `node:${pid}:${randomSuffix()}`;
  }

  return `unknown::${randomSuffix()}`;
};
