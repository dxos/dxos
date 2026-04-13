//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

import { diffSync } from './diff-sync';

export type SyncEffects<External, Stored> = {
  /** Persist a new ECHO object for an external item. */
  create: (external: External) => Promise<Stored> | Stored;
  /** Apply changes from `external` onto the existing `stored` ECHO object. */
  update: (external: External, stored: Stored) => Promise<void> | void;
  /**
   * Handle an ECHO object whose external source is gone. Typical choices:
   * set a `closed` / `archived` flag, or call `space.db.remove()`. Provide a
   * no-op if you want to preserve everything that was ever synced.
   */
  remove: (stored: Stored) => Promise<void> | void;
};

export type RunSyncConfig<External, Stored> = {
  /** Fetch all external items. One-shot; pagination should be handled inside. */
  fetchExternal: () => Promise<readonly External[]>;
  /** Load the existing ECHO objects that represent items previously synced from this source. */
  loadStored: () => Promise<readonly Stored[]>;
  externalId: (item: External) => string;
  storedExternalId: (item: Stored) => string | undefined;
  equal?: (external: External, stored: Stored) => boolean;
  effects: SyncEffects<External, Stored>;
  /** Called with the UTC timestamp of the successful sync. Typically stamps `lastSyncedAt` on an account object. */
  onSynced?: (at: Date) => Promise<void> | void;
};

export type SyncSummary = {
  created: number;
  updated: number;
  unchanged: number;
  removed: number;
  /** Millisecond duration. */
  durationMs: number;
};

/**
 * Orchestrates a one-shot sync cycle:
 *   1. `fetchExternal` + `loadStored` (in parallel)
 *   2. `diffSync` computes add/update/remove sets
 *   3. Effects are applied sequentially within each phase:
 *      creates → updates → removes
 *   4. `onSynced` is called with `new Date()` on success.
 *
 * Sequential within phase so that write order is predictable; feel free to
 * parallelize inside `create`/`update`/`remove` if the target store supports it.
 *
 * Throws whatever `fetchExternal`/`loadStored`/effects throw — callers decide
 * whether to surface errors or retry.
 */
export const runSync = async <External, Stored>(
  config: RunSyncConfig<External, Stored>,
): Promise<SyncSummary> => {
  const start = Date.now();
  const [external, stored] = await Promise.all([config.fetchExternal(), config.loadStored()]);

  const diff = diffSync<External, Stored>({
    external,
    stored,
    externalId: config.externalId,
    storedExternalId: config.storedExternalId,
    equal: config.equal,
  });

  for (const item of diff.toCreate) {
    await config.effects.create(item);
  }
  for (const { external: item, stored: existing } of diff.toUpdate) {
    await config.effects.update(item, existing);
  }
  for (const item of diff.toRemove) {
    await config.effects.remove(item);
  }

  const now = new Date();
  if (config.onSynced) {
    await config.onSynced(now);
  }

  const summary: SyncSummary = {
    created: diff.toCreate.length,
    updated: diff.toUpdate.length,
    unchanged: diff.unchanged.length,
    removed: diff.toRemove.length,
    durationMs: Date.now() - start,
  };
  log.info('sync-engine: cycle complete', summary);
  return summary;
};
