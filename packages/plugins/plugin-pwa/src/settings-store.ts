//
// Copyright 2026 DXOS.org
//

import * as KvsStore from '@dxos/effect/KvsStore';

import { Settings } from '#types';

import { PwaNamespace } from './namespace.ts';

export type PwaOptions = {
  /** Whether auto-update is on for a user who has not set it. */
  defaultAutoUpdate?: boolean;
  /** Whether the build registers a service worker; without one, updates are found by comparing builds. */
  serviceWorker?: boolean;
};

/** The only atom on this key: a second `KvsStore.make` on it would not see this one's writes. */
export const settingsAtom = KvsStore.make({
  key: PwaNamespace.key,
  schema: Settings.Settings,
  defaultValue: () => ({}),
});

export const isAutoUpdateOn = (settings: Settings.Settings, { defaultAutoUpdate = false }: PwaOptions): boolean =>
  settings.autoUpdate ?? defaultAutoUpdate;
