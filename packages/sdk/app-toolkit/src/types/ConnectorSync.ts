//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/**
 * Three-way merge primitives shared by connector sync handlers (Trello, Linear,
 * GitHub, ...). Each external-sync cursor stores per-remote-id snapshots on its
 * `spec.snapshots` field (via `Cursor.readSnapshot`/`Cursor.writeSnapshot` in
 * `@dxos/link`) so the next pull/push pass can decide, per field, whether the
 * local or the remote side has changed since the last successful sync.
 *
 * These primitives are pure value-merge math with no `Cursor` dependency — the
 * snapshot storage accessors live in `@dxos/link` instead, alongside `Cursor`'s
 * other field helpers (`advance`, `recordError`, ...).
 */

/** Result of {@link mergeField} / {@link mergeDeep}. */
export type MergeResult<T> = { value: T; source: 'local' | 'remote' | 'unchanged' };

/**
 * Snapshot wrapper passed to the merge primitives.
 *
 * `undefined` means "no snapshot has ever been recorded for this id" — the
 * merge treats it as first-sync and takes remote.
 *
 * `{ value }` means "the snapshot has a recorded value" — and `value` may
 * itself be `undefined` (e.g. Linear's "no priority" sentinel). This is the
 * critical distinction: if a caller collapses "no snapshot" and "snapshot
 * value is undefined" into the same `undefined`, then a local edit that
 * disagrees with a recorded-undefined snapshot gets clobbered on pull as if
 * the user had never edited it.
 */
export type Snapshot<T> = { value: T } | undefined;

/**
 * Per-field three-way merge over `(local, remote, snapshot)`.
 *
 * - No snapshot (first sync of this id): take remote.
 * - Local unchanged, remote unchanged → no-op (return local).
 * - Local unchanged, remote changed → take remote (pull).
 * - Local changed, remote unchanged → keep local (push will write it).
 * - Both changed → **remote wins** (the integration's source-of-truth policy).
 *
 * Equality is `===` for primitives (numbers, strings, booleans). For object /
 * array values use {@link mergeDeep} instead.
 */
export const mergeField = <T>(local: T, remote: T, snapshot: Snapshot<T>): MergeResult<T> => {
  if (snapshot === undefined) {
    return { value: remote, source: local === remote ? 'unchanged' : 'remote' };
  }
  const snapshotValue = snapshot.value;
  const localChanged = local !== snapshotValue;
  const remoteChanged = remote !== snapshotValue;
  if (!localChanged && !remoteChanged) {
    return { value: local, source: 'unchanged' };
  }
  if (!localChanged && remoteChanged) {
    return { value: remote, source: 'remote' };
  }
  if (localChanged && !remoteChanged) {
    return { value: local, source: 'local' };
  }
  // Both changed → remote-wins by policy.
  return { value: remote, source: 'remote' };
};

/**
 * Stable JSON stringify: sorts object keys recursively so structurally-equal
 * objects with different insertion order serialize to the same string. ECHO /
 * Automerge canonicalizes maps to alphabetical key order on reload, while a
 * remote-derived map (e.g. Trello's `arrangement.columns` built in `pos`
 * order) preserves insertion order — without sorting, the equality check
 * below would flag a no-op merge as `remote` and force a write every sync.
 */
const stableStringify = (value: unknown): string =>
  JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(val as Record<string, unknown>).sort()) {
        sorted[key] = (val as Record<string, unknown>)[key];
      }
      return sorted;
    }
    return val;
  });

/** Deep-equal merge for object values (e.g. arrangement). Same policy as {@link mergeField}. */
export const mergeDeep = <T>(local: T, remote: T, snapshot: Snapshot<T>): MergeResult<T> => {
  const eq = (a: unknown, b: unknown) => stableStringify(a) === stableStringify(b);
  if (snapshot === undefined) {
    return { value: remote, source: eq(local, remote) ? 'unchanged' : 'remote' };
  }
  const snapshotValue = snapshot.value;
  const localChanged = !eq(local, snapshotValue);
  const remoteChanged = !eq(remote, snapshotValue);
  if (!localChanged && !remoteChanged) {
    return { value: local, source: 'unchanged' };
  }
  if (!localChanged && remoteChanged) {
    return { value: remote, source: 'remote' };
  }
  if (localChanged && !remoteChanged) {
    return { value: local, source: 'local' };
  }
  // Both changed → remote-wins by policy.
  return { value: remote, source: 'remote' };
};

/**
 * Build a {@link Snapshot} wrapper for one field of a snapshot object.
 *
 * Returns `undefined` when no snapshot exists for the id at all (first sync),
 * or `{ value }` when the snapshot exists — `value` may itself be `undefined`
 * if the field is a legitimate "no value" sentinel (e.g. Linear's priority).
 */
export const snapshotField = <T extends object, K extends keyof T>(snapshot: T | undefined, key: K): Snapshot<T[K]> =>
  snapshot === undefined ? undefined : { value: snapshot[key] };

/**
 * Build a {@link Snapshot} wrapper from an optional raw value. Use when the
 * caller already has the conditional "do I have a snapshot" check.
 */
export const snapshotOf = <T>(present: boolean, value: T): Snapshot<T> => (present ? { value } : undefined);
