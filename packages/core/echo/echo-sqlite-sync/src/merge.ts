//
// Copyright 2026 DXOS.org
//

import type { SyncRecord } from '@dxos/echo-sync-worker/protocol';

/** JSON with object keys sorted, so two records that hold the same values compare equal. */
const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, inner: unknown) =>
    inner !== null && typeof inner === 'object' && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner).sort(([left], [right]) => left.localeCompare(right)))
      : inner,
  );

/** Cheap and stable — only used to tell whether two versions of a record hold the same thing. */
export const fingerprint = (record: SyncRecord | undefined): string | undefined =>
  record && canonical([record.typename, record.props, record.refs, record.deleted ?? false]);

/** Two versions of a record hold the same thing; the seq they carry is not part of it. */
export const same = (left: SyncRecord | undefined, right: SyncRecord | undefined): boolean =>
  fingerprint(left) === fingerprint(right);

/**
 * A local record as an edit on top of `base`: an edge absent locally was not cleared — its target is
 * just not resident, and a clear travels as `null` — so it keeps the value `base` has.
 */
export const onBase = (local: SyncRecord, base: SyncRecord | undefined): SyncRecord => {
  if (!base || local.deleted) {
    return local;
  }
  const missing = Object.entries(base.refs).filter(([property]) => !(property in local.refs));
  return missing.length === 0 ? local : { ...local, refs: { ...Object.fromEntries(missing), ...local.refs } };
};

/** Field by field: whatever the local side changed since `base` wins, everything else comes from `remote`. */
const mergeFields = <T>(
  base: Readonly<Record<string, T>>,
  local: Readonly<Record<string, T>>,
  remote: Readonly<Record<string, T>>,
): Record<string, T> => {
  const out: Record<string, T> = {};
  for (const key of new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)])) {
    const changed = canonical(local[key]) !== canonical(base[key]);
    const value = changed ? local[key] : remote[key];
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
};

/**
 * Three-way merge of a local edit and a remote version that both moved on from `base`.
 *
 * Concurrent edits to different fields both survive; an edit to the same field keeps the local one,
 * which is then pushed on top of `remote` — so the push that lands last wins, but only after its writer
 * has seen what it overwrites. A delete on either side wins: undoing a delete would resurrect an object
 * whose edges the deleter has already let go of.
 */
export const merge3 = (base: SyncRecord | undefined, local: SyncRecord, remote: SyncRecord): SyncRecord => {
  if (local.deleted || remote.deleted) {
    return { key: remote.key, typename: remote.typename, props: {}, refs: {}, deleted: true };
  }
  return {
    key: remote.key,
    typename: remote.typename,
    props: mergeFields(base?.props ?? {}, local.props, remote.props),
    refs: mergeFields(base?.refs ?? {}, local.refs, remote.refs),
  };
};
