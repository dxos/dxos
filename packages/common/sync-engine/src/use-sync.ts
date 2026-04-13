//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';

import { runSync, type RunSyncConfig, type SyncSummary } from './run-sync';

export type SyncState = {
  /** True while a sync is in flight. */
  syncing: boolean;
  /** Timestamp of the last successful sync. `undefined` until the first success. */
  lastSyncedAt: Date | undefined;
  /** Last error thrown by a sync. Cleared on the next successful sync. */
  error: Error | undefined;
  /** Summary of the most recent successful sync. */
  lastSummary: SyncSummary | undefined;
};

export type UseSyncOptions<External, Stored> = RunSyncConfig<External, Stored> & {
  /**
   * If set, the hook runs a sync automatically on mount.
   * Pass `'once'` to sync only when `lastSyncedAt` is initially undefined
   * (useful when `lastSyncedAt` is persisted on an account object and a sync
   * should only happen on first open).
   * Pass `true` to sync on every mount regardless.
   */
  auto?: 'once' | true | false;
  /** Initial `lastSyncedAt` — pass in from the persisted account object. */
  initialLastSyncedAt?: Date;
};

/**
 * React hook that binds `runSync` to a local state machine. Returns a
 * `sync()` callback that guards against concurrent invocations, plus the
 * current sync state for UI rendering.
 *
 * Does NOT own the credentials, the external fetcher, or the ECHO effects —
 * all of that is the caller's responsibility via `config`. This hook is only
 * the driver that knows about the state-per-render.
 */
export const useSync = <External, Stored>(options: UseSyncOptions<External, Stored>) => {
  const { auto = false, initialLastSyncedAt, ...config } = options;
  const [state, setState] = useState<SyncState>(() => ({
    syncing: false,
    lastSyncedAt: initialLastSyncedAt,
    error: undefined,
    lastSummary: undefined,
  }));
  const inFlight = useRef(false);
  const configRef = useRef(config);
  configRef.current = config;

  const sync = useCallback(async (): Promise<SyncSummary | undefined> => {
    if (inFlight.current) {
      return undefined;
    }
    inFlight.current = true;
    setState((prev) => ({ ...prev, syncing: true, error: undefined }));
    try {
      const summary = await runSync(configRef.current);
      const now = new Date();
      setState({ syncing: false, lastSyncedAt: now, error: undefined, lastSummary: summary });
      return summary;
    } catch (err) {
      log.warn('useSync: cycle failed', { error: String(err) });
      const error = err instanceof Error ? err : new Error(String(err));
      setState((prev) => ({ ...prev, syncing: false, error }));
      return undefined;
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (auto === true) {
      void sync();
    } else if (auto === 'once' && !initialLastSyncedAt) {
      void sync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...state, sync };
};
