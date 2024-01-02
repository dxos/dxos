//
// Copyright 2023 DXOS.org
//

import { type Context, createContext } from 'react';

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import type { TimerCallback, TimerOptions } from '@dxos/async';

import { DEBUG_PLUGIN } from './meta';

const DEBUG_ACTION = `${DEBUG_PLUGIN}/action`;
export enum DebugAction {
  OPEN_DEVTOOLS = `${DEBUG_ACTION}/open-devtools`,
}

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

export type DebugSettingsProps = { devtools?: boolean; debug?: boolean };

export type DebugPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  SettingsProvides<DebugSettingsProps> &
  TranslationsProvides;
