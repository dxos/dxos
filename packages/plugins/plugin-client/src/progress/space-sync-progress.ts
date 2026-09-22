//
// Copyright 2026 DXOS.org
//

import { type Database } from '@dxos/echo';

/** Registry update for a space's replication monitor. */
export type MonitorUpdate = {
  readonly label: string;
  /** Items synced since the run's baseline. */
  readonly current: number;
  /** Items synced since the baseline plus the backlog still pending. */
  readonly total: number;
  /** Items synced in absolute terms, which the caller keeps as the baseline of the run it opens. */
  readonly synced: number;
  readonly note?: string;
};

/**
 * Derives the combined (documents + feed blocks) monitor state for a space, or `undefined` when it
 * is fully caught up. Both backlogs share one meter so the UI shows one row per space.
 *
 * The meter counts the run, not the space: `current` is what has synced since `baseline` (the
 * absolute synced count when the monitor opened) and `total` adds the backlog still pending. Counting
 * the whole space instead put a monitor that opened at 5,020 of 5,021 at the end of its bar with an
 * ETA of zero, since the ETA divides the run's elapsed time by everything synced before it began.
 *
 * The label leads with the phase, matching the mail sync meter — a name-only label never said that
 * the meter was tracking sync.
 */
export const toSpaceUpdate = (
  name: string | undefined,
  state: Database.SyncState,
  baseline?: number,
): MonitorUpdate | undefined => {
  const unsyncedDocuments = state.unsyncedDocumentCount;
  const blocksToPull = Number(state.blocksToPull);
  const blocksToPush = Number(state.blocksToPush);
  const unsyncedBlocks = blocksToPull + blocksToPush;
  const pending = unsyncedDocuments + unsyncedBlocks;
  if (pending === 0) {
    return undefined;
  }

  const totalDocuments = state.totalDocumentCount > 0 ? state.totalDocumentCount : unsyncedDocuments;
  const totalBlocks = Number(state.totalBlocks) > 0 ? Number(state.totalBlocks) : unsyncedBlocks;
  const synced = Math.max(0, totalDocuments + totalBlocks - pending);
  const current = Math.max(0, synced - (baseline ?? synced));

  const notes: string[] = [];
  if (unsyncedDocuments > 0) {
    notes.push(`${unsyncedDocuments} objects`);
  }
  if (unsyncedBlocks > 0) {
    notes.push(`↓${blocksToPull} ↑${blocksToPush}`);
  }

  return {
    label: `Syncing ${name ?? 'Space'}`,
    current,
    total: current + pending,
    synced,
    note: notes.join(' · '),
  };
};
