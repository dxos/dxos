//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';

/**
 * Three-way merge primitives shared by integration sync handlers (Trello, Linear,
 * GitHub, ...). Each integration stores per-remote-id snapshots on its
 * `Integration` object's `.snapshots` field so the next pull/push pass can
 * decide, per field, whether the local or the remote side has changed since
 * the last successful sync.
 *
 * The merge primitives are pure; the snapshot accessors operate on any ECHO
 * object that exposes `.snapshots: Record<string, unknown>` — typically the
 * `Integration` schema in `@dxos/plugin-integration` — but app-toolkit does
 * not import that schema directly to avoid a cycle.
 */

/** Result of {@link mergeField} / {@link mergeDeep}. */
export type MergeResult<T> = { value: T; source: 'local' | 'remote' | 'unchanged' };

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
export const mergeField = <T>(local: T, remote: T, snapshot: T | undefined): MergeResult<T> => {
  if (snapshot === undefined) {
    return { value: remote, source: local === remote ? 'unchanged' : 'remote' };
  }
  const localChanged = local !== snapshot;
  const remoteChanged = remote !== snapshot;
  if (!localChanged && !remoteChanged) {
    return { value: local, source: 'unchanged' };
  }
  if (!localChanged && remoteChanged) {
    return { value: remote, source: 'remote' };
  }
  if (localChanged && !remoteChanged) {
    return { value: local, source: 'local' };
  }
  return { value: remote, source: 'remote' };
};

/** Deep-equal merge for object values (e.g. arrangement). Same policy as {@link mergeField}. */
export const mergeDeep = <T>(local: T, remote: T, snapshot: T | undefined): MergeResult<T> => {
  const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (snapshot === undefined) {
    return { value: remote, source: eq(local, remote) ? 'unchanged' : 'remote' };
  }
  const localChanged = !eq(local, snapshot);
  const remoteChanged = !eq(remote, snapshot);
  if (!localChanged && !remoteChanged) {
    return { value: local, source: 'unchanged' };
  }
  if (!localChanged && remoteChanged) {
    return { value: remote, source: 'remote' };
  }
  if (localChanged && !remoteChanged) {
    return { value: local, source: 'local' };
  }
  return { value: remote, source: 'remote' };
};

/** Type alias for the integration-side carrier of snapshots. */
export type SnapshotCarrier = Obj.Unknown & { snapshots?: Record<string, unknown> };

/** Reads `carrier.snapshots[foreignId]` typed as `T`. Returns undefined if absent. */
export const readSnapshot = <T extends object>(carrier: SnapshotCarrier, foreignId: string): T | undefined => {
  const snapshots = (carrier.snapshots ?? {}) as Record<string, unknown>;
  return snapshots[foreignId] as T | undefined;
};

/**
 * Writes `carrier.snapshots[foreignId] = snapshot` inside an `Obj.update`. Allocates
 * a fresh map so the assignment is safe under ECHO's structural-sharing semantics.
 */
export const writeSnapshot = (carrier: SnapshotCarrier, foreignId: string, snapshot: object): void => {
  Obj.update(carrier, (carrier) => {
    const existing = (carrier.snapshots ?? {}) as Record<string, unknown>;
    carrier.snapshots = { ...existing, [foreignId]: snapshot };
  });
};
