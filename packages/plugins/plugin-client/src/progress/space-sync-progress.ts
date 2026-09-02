//
// Copyright 2026 DXOS.org
//

import { type Database } from '@dxos/echo';

/** Registry update for a space's replication monitor. */
export type MonitorUpdate = {
  readonly label: string;
  readonly current: number;
  readonly total: number;
  readonly note?: string;
};

/**
 * Derives the combined (documents + feed blocks) monitor state for a space, or `undefined` when it
 * is fully caught up. Both backlogs share one meter so the UI shows one row per space.
 *
 * The label leads with the phase, matching the mail sync meter — a name-only label never said that
 * the meter was tracking sync.
 */
export const toSpaceUpdate = (name: string | undefined, state: Database.SyncState): MonitorUpdate | undefined => {
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
  const total = totalDocuments + totalBlocks;

  const notes: string[] = [];
  if (unsyncedDocuments > 0) {
    notes.push(`${unsyncedDocuments} objects`);
  }
  if (unsyncedBlocks > 0) {
    notes.push(`↓${blocksToPull} ↑${blocksToPush}`);
  }

  return {
    label: `Syncing ${name ?? 'Space'}`,
    current: Math.max(0, total - pending),
    total,
    note: notes.join(' · '),
  };
};
