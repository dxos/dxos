//
// Copyright 2026 DXOS.org
//

import * as KvsStore from '@dxos/effect/KvsStore';

import { Settings } from '#types';

import { PwaNamespace } from './namespace.ts';

export type PwaOptions = {
  /** Whether auto-update is on for a user who has not set it. */
  defaultAutoUpdate?: boolean;
  /**
   * Whether the build registers a service worker. Without one, updates are found by comparing the
   * running build with the one the server serves, and applied by reloading.
   */
  serviceWorker?: boolean;
};

/**
 * Shared by the settings module and the boot gate: the gate runs at startup, long before the
 * idle-wave settings module, and two atoms on one key would not see each other's writes.
 */
export const settingsAtom = KvsStore.make({
  key: PwaNamespace.key,
  schema: Settings.Settings,
  defaultValue: () => ({}),
});

export const isAutoUpdateOn = (settings: Settings.Settings, { defaultAutoUpdate = false }: PwaOptions): boolean =>
  settings.autoUpdate ?? defaultAutoUpdate;
