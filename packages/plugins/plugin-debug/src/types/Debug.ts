//
// Copyright 2023 DXOS.org
//

import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import { type IdbLogStore } from '@dxos/log-store-idb';

import { meta } from '#meta';

import * as Settings from './Settings.ts';

export type DebugPluginOptions = {
  /** Shared persistent log store for capturing and downloading logs. */
  logStore?: IdbLogStore;
  /** Persist the stats-panel store to localStorage so it survives a reload. Defaults to `true`. */
  persistStats?: boolean;
};

export namespace DebugCapabilities {
  export const Settings = Capability.makeSingleton<Atom.Writable<Settings.Settings>>()(
    `${meta.profile.key}.capability.settings`,
  );
}
