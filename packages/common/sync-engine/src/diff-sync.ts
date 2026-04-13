//
// Copyright 2026 DXOS.org
//

/**
 * Result of diffing a batch of freshly-fetched external items against the set
 * of ECHO objects that already represent that external source.
 */
export type SyncDiff<External, Stored> = {
  /** External items with no existing stored counterpart. */
  toCreate: External[];
  /** External items whose stored counterpart is stale (or equality was not checked). */
  toUpdate: { external: External; stored: Stored }[];
  /** External items whose stored counterpart is already up to date. */
  unchanged: { external: External; stored: Stored }[];
  /** Stored objects whose external item is no longer present in the source. */
  toRemove: Stored[];
};

export type DiffSyncConfig<External, Stored> = {
  /** Items just fetched from the external source. */
  external: readonly External[];
  /** ECHO objects that were previously synced from this source. */
  stored: readonly Stored[];
  /** Stable ID extracted from the external item (e.g. Trello card id, Slack channel id). */
  externalId: (item: External) => string;
  /** Same ID, read off the stored ECHO object (usually from `Obj.Meta.keys` or a field). */
  storedExternalId: (item: Stored) => string | undefined;
  /**
   * Optional equality check. If provided, items where equal() returns true are
   * placed in `unchanged` instead of `toUpdate`. If omitted, every matched pair
   * is considered `toUpdate`.
   */
  equal?: (external: External, stored: Stored) => boolean;
};

/**
 * Diff a batch of external items against the set of currently-stored ECHO
 * objects for that source, producing lists of creates, updates, and removes.
 *
 * Pure function — no side effects. Plug the result into your own upsert code
 * or the `runSync` orchestrator in this package.
 *
 * Notes:
 * - Stored items whose `storedExternalId()` returns undefined are silently
 *   ignored — they're not considered removed, since they were never part of
 *   this source.
 * - Duplicate external IDs in `external` are kept verbatim; the caller is
 *   responsible for resolving duplicates in upstream data.
 */
export const diffSync = <External, Stored>(
  config: DiffSyncConfig<External, Stored>,
): SyncDiff<External, Stored> => {
  const { external, stored, externalId, storedExternalId, equal } = config;

  const storedById = new Map<string, Stored>();
  for (const item of stored) {
    const id = storedExternalId(item);
    if (id !== undefined) {
      storedById.set(id, item);
    }
  }

  const toCreate: External[] = [];
  const toUpdate: { external: External; stored: Stored }[] = [];
  const unchanged: { external: External; stored: Stored }[] = [];
  const seenExternalIds = new Set<string>();

  for (const item of external) {
    const id = externalId(item);
    seenExternalIds.add(id);
    const match = storedById.get(id);
    if (!match) {
      toCreate.push(item);
    } else if (equal && equal(item, match)) {
      unchanged.push({ external: item, stored: match });
    } else {
      toUpdate.push({ external: item, stored: match });
    }
  }

  const toRemove: Stored[] = [];
  for (const [id, item] of storedById) {
    if (!seenExternalIds.has(id)) {
      toRemove.push(item);
    }
  }

  return { toCreate, toUpdate, unchanged, toRemove };
};
