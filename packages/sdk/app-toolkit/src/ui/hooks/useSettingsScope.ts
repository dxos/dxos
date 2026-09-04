//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { useCallback } from 'react';

import { useOptionalCapability } from '@dxos/app-framework/ui';

import * as AppCapabilities from '../../app-framework/AppCapabilities';

/** Stable fallback so the atom hook keeps a constant identity while the sync is unavailable. */
const emptyUnsynced = Atom.make<readonly string[]>([]);

export type SettingsScopeState = {
  /**
   * Whether the device-synced settings store is available at all. `false` before the settings space
   * opens and in hosts with no client, where settings are device-local with nothing to choose.
   */
  readonly available: boolean;
  /** Whether this prefix follows the account rather than staying on this device. */
  readonly synced: boolean;
  /**
   * Leave or rejoin the account for this prefix. Leaving is lossless; rejoining replaces this
   * device's values with the account's, so callers confirm with the user first.
   */
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
  const setSynced = useCallback((synced: boolean) => sync?.setSynced(prefix, synced), [sync, prefix]);

  return { available: !!sync, synced: !unsynced.includes(prefix), setSynced };
};
