//
// Copyright 2023 DXOS.org
//

import { type Context, createContext } from 'react';

import type { GraphProvides } from '@braneframe/plugin-graph';
import type { IntentProvides } from '@braneframe/plugin-intent';
import type { TranslationsProvides } from '@braneframe/plugin-theme';
import { type TimerCallback, type TimerOptions } from '@dxos/async';

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

export type DebugSettingsProps = { devtools?: boolean; debug?: boolean };

export type DebugPluginProvides = IntentProvides &
  GraphProvides &
  TranslationsProvides & {
    settings: DebugSettingsProps;
  };
