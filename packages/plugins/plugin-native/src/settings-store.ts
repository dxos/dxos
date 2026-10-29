//
// Copyright 2026 DXOS.org
//

import * as KvsStore from '@dxos/effect/KvsStore';

import { Settings } from '#types';

import { NativeNamespace } from './namespace.ts';

export type NativeOptions = {
  /** Whether auto-update is on for a user who has not set it. */
  defaultAutoUpdate?: boolean;
};

/**
 * Shared by the settings module and the boot gate: the gate runs at startup, long before the
 * idle-wave settings module, and two atoms on one key would not see each other's writes.
 */
export const settingsAtom = KvsStore.make({
  key: NativeNamespace.key,
  schema: Settings.Settings,
  defaultValue: () => ({}),
});

export const isAutoUpdateOn = (settings: Settings.Settings, { defaultAutoUpdate = false }: NativeOptions): boolean =>
  settings.autoUpdate ?? defaultAutoUpdate;
