//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { useCallback, useMemo } from 'react';

import { useOptionalCapability } from '@dxos/app-framework/ui';

import * as AppCapabilities from '../../app-framework/AppCapabilities';
import * as AppSettings from '../../types/AppSettings';

/** Stable fallback so the atom hook keeps a constant identity while the sync is unavailable. */
const emptyUnsynced = Atom.make<readonly string[]>([]);
const emptyOverrides = Atom.make<AppSettings.Namespaces>({});

export type SettingsScopeState = {
  /**
   * Whether the device-synced settings store is available at all. `false` before the settings space
   * opens and in hosts with no client, where settings are device-local with nothing to choose.
   */
  readonly available: boolean;
  /** Whether this prefix follows the account rather than staying on this device. */
  readonly synced: boolean;
  /**
   * Leave or rejoin the account for this prefix. Leaving is lossless; rejoining keeps one side of
   * each conflicting key — the account's by default, this device's with `adopt: 'local'`.
   */
  setSynced: (synced: boolean, options?: { adopt?: AppSettings.Adopt }) => void;
  /**
   * Keys rejoining would change, read at the moment of asking. Empty means rejoining loses nothing,
   * so there is no question to put to the reader.
   */
  getConflicts: () => readonly string[];
};

export type SettingsKeyScopeState = {
  /** Whether the device-synced settings store is available at all. */
  readonly available: boolean;
  /** Whether this key follows the account, rather than being pinned to this device. */
  readonly synced: boolean;
  /**
   * Whether this key's value here actually differs from the account's. A pinned key that agrees is
   * not diverged, and marking it as though it were reads as a change nobody made.
   */
  readonly diverged: boolean;
  /** Pin this key to the device, or hand it back. Pinning is lossless. */
  setSynced: (synced: boolean) => void;
};

/**
 * Reactive sync scope for one settings prefix.
 *
 * The state seam shared by the settings plank header and the plugin registry — the two render very
 * different controls (an icon button versus a switch row), so only the state is worth sharing.
 */
export const useSettingsScope = (prefix: string): SettingsScopeState => {
  const sync = useOptionalCapability(AppCapabilities.SettingsSync);
  const unsynced = useAtomValue(sync?.unsynced ?? emptyUnsynced);
  const setSynced = useCallback(
    (synced: boolean, options?: { adopt?: AppSettings.Adopt }) => sync?.setSynced(prefix, synced, options),
    [sync, prefix],
  );
  const getConflicts = useCallback(() => sync?.conflicts(prefix) ?? [], [sync, prefix]);

  return { available: !!sync, synced: !unsynced.includes(prefix), setSynced, getConflicts };
};

/**
 * Reactive sync scope for one key within a prefix — one plugin's place in the plugin set, rather
 * than the set as a whole.
 */
export const useSettingsKeyScope = (prefix: string, key: string): SettingsKeyScopeState => {
  const sync = useOptionalCapability(AppCapabilities.SettingsSync);
  const overrides = useAtomValue(sync?.overrides ?? emptyOverrides);
  const setSynced = useCallback((synced: boolean) => sync?.setKeySynced(prefix, key, synced), [sync, prefix, key]);
  const pinned = key in (overrides[prefix] ?? {});

  return {
    available: !!sync,
    synced: !pinned,
    // Read on demand: the conflicting set is derived from both layers, and only the store knows the
    // account's side.
    diverged: pinned && (sync?.conflicts(prefix) ?? []).includes(key),
    setSynced,
  };
};

/**
 * Keys within a prefix whose value here differs from the account's.
 *
 * For marking a list: a key pinned to a value the account agrees with is not diverged, so it is not
 * included. Re-derived whenever the device layer is republished, which the sync does on any settings
 * change — including one made on another device, which is what turns an agreeing pin into a
 * diverging one.
 */
export const useSettingsDivergedKeys = (prefix: string): ReadonlySet<string> => {
  const sync = useOptionalCapability(AppCapabilities.SettingsSync);
  const overrides = useAtomValue(sync?.overrides ?? emptyOverrides);

  return useMemo(() => {
    void overrides;
    return new Set(sync?.conflicts(prefix) ?? []);
  }, [sync, prefix, overrides]);
};
