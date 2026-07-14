//
// Copyright 2026 DXOS.org
//

export type FeedNamespaceSyncEntry = {
  readonly namespace: string;
  readonly blocksToPull?: string;
  readonly blocksToPush?: string;
  readonly totalBlocks?: string;
};

export type FeedSyncAggregate = {
  /** Combined blocks to pull + push across namespaces. */
  readonly pending: number;
  /** Total blocks stored locally across namespaces. */
  readonly total: number;
};

/** Aggregates per-namespace feed sync backlog into one space-level snapshot. */
export const aggregateFeedSyncState = (namespaces: readonly FeedNamespaceSyncEntry[]): FeedSyncAggregate =>
  namespaces.reduce<FeedSyncAggregate>(
    (aggregate, entry) => ({
      pending: aggregate.pending + Number(entry.blocksToPull ?? 0) + Number(entry.blocksToPush ?? 0),
      total: aggregate.total + Number(entry.totalBlocks ?? 0),
    }),
    { pending: 0, total: 0 },
  );

/** Formats per-namespace backlog for a progress monitor note line. */
export const formatFeedSyncNote = (namespaces: readonly FeedNamespaceSyncEntry[]): string | undefined => {
  const parts = namespaces
    .map((entry) => {
      const pending = Number(entry.blocksToPull ?? 0) + Number(entry.blocksToPush ?? 0);
      if (pending === 0) {
        return undefined;
      }
      return `${entry.namespace}: ${pending}`;
    })
    .filter((part): part is string => part != null);

  return parts.length > 0 ? parts.join(' · ') : undefined;
};
