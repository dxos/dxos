//
// Copyright 2023 DXOS.org
//

import { Context, createContext } from 'react';

import type { GraphProvides } from '@braneframe/plugin-graph';
import { IntentProvides } from '@braneframe/plugin-intent';
import type { TranslationsProvides } from '@braneframe/plugin-theme';

import { TimerCallback, TimerOptions } from './timer';

export const DEBUG_PLUGIN = 'dxos.org/plugin/debug';

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

export type DebugPluginProvides = IntentProvides & GraphProvides & TranslationsProvides;
