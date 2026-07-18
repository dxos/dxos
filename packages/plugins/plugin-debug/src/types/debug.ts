//
// Copyright 2023 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import { type Context, createContext } from 'react';

import { Capability } from '@dxos/app-framework';
import type { TimerCallback, TimerOptions } from '@dxos/async';
import { type IdbLogStore } from '@dxos/log-store-idb';

import { meta } from '#meta';

import * as Settings from './Settings';

export type DebugPluginOptions = {
  /** Shared persistent log store for capturing and downloading logs. */
  logStore?: IdbLogStore;
  /** Persist the stats-panel store to localStorage so it survives a reload. Defaults to `true`. */
  persistStats?: boolean;
};

export type DebugContextType = {
  running: boolean;
  start: (cb: TimerCallback, options: TimerOptions) => void;
  stop: () => void;
};

export const DebugContext: Context<DebugContextType> = createContext<DebugContextType>({
  running: false,
  start: () => {},
  stop: () => {},
});

export namespace DebugCapabilities {
  export const Settings = Capability.makeSingleton<Atom.Writable<Settings.Settings>>(
    `${meta.profile.key}.capability.settings`,
  );
}
