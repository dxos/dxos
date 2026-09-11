//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { useCallback, useMemo } from 'react';

import { useOptionalCapability } from '@dxos/app-framework/ui';

import * as AppCapabilities from '../../app-framework/AppCapabilities.ts';
import * as AppSettings from '../../types/AppSettings.ts';

/** Stable fallback so the atom hook keeps a constant identity while the sync is unavailable. */
const emptyUnsynced = Atom.make<readonly string[]>([]);
const emptyPinned = Atom.make<AppSettings.DeviceSettings>({});

export type SettingsScopeState = {
  /** Whether the device-synced settings store is available at all. */
  readonly available: boolean;
  /** Whether this prefix follows the account rather than staying on this device. */
  readonly synced: boolean;
  /** Take this prefix off the account. Lossless. */
  takeLocal: () => void;
  /** Hand this prefix back, keeping the side named by `adopt` where the two disagree. */
  rejoinAccount: (options?: { adopt?: AppSettings.Adopt }) => void;
  /** Keys rejoining would change, read at the moment of asking. */
  getConflicts: () => readonly string[];
};

export type SettingsKeyScopeState = {
  /** Whether the device-synced settings store is available at all. */
  readonly available: boolean;
  /** Whether this key follows the account, rather than being pinned to this device. */
  readonly synced: boolean;
  /** Whether this key's value here actually differs from the account's. */
  readonly diverged: boolean;
  /** Keep this key on this device. Changes nothing visible until the two sides drift apart. */
  pin: () => void;
  /** Hand this key back to the account, whose value then takes over. */
  unpin: () => void;
};

/** Reactive sync scope for one settings prefix. */
export const useSettingsScope = (prefix: string): SettingsScopeState => {
  const sync = useOptionalCapability(AppCapabilities.SettingsSync);
  const unsynced = useAtomValue(sync?.unsynced ?? emptyUnsynced);
  const takeLocal = useCallback(() => sync?.takeLocal(prefix), [sync, prefix]);
  const rejoinAccount = useCallback(
    (options?: { adopt?: AppSettings.Adopt }) => sync?.rejoinAccount(prefix, options),
    [sync, prefix],
  );
  const getConflicts = useCallback(() => sync?.conflicts(prefix) ?? [], [sync, prefix]);

  return { available: !!sync, synced: !unsynced.includes(prefix), takeLocal, rejoinAccount, getConflicts };
};

/** Reactive sync scope for one key within a prefix, rather than the prefix as a whole. */
export const useSettingsKeyScope = (prefix: string, key: string): SettingsKeyScopeState => {
  const sync = useOptionalCapability(AppCapabilities.SettingsSync);
  const pins = useAtomValue(sync?.pinned ?? emptyPinned);
  const pin = useCallback(() => sync?.pinKey(prefix, key), [sync, prefix, key]);
  const unpin = useCallback(() => sync?.unpinKey(prefix, key), [sync, prefix, key]);
  const pinned = (pins[prefix]?.keys ?? []).includes(key);

  return {
    available: !!sync,
    synced: !pinned,
    diverged: pinned && (sync?.conflicts(prefix) ?? []).includes(key),
    pin,
    unpin,
  };
};

/**
 * Keys within a prefix whose value here differs from the account's. Re-derived whenever the device
 * layer is republished, which the sync does on any settings change.
 */
export const useSettingsDivergedKeys = (prefix: string): ReadonlySet<string> => {
  const sync = useOptionalCapability(AppCapabilities.SettingsSync);
  const pins = useAtomValue(sync?.pinned ?? emptyPinned);

  return useMemo(() => {
    void pins;
    return new Set(sync?.conflicts(prefix) ?? []);
  }, [sync, prefix, pins]);
};
