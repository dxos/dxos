//
// Copyright 2023 DXOS.org
//

import { type Context, createContext } from 'react';

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import type { TimerCallback, TimerOptions } from '@dxos/async';

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

export type DebugPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides & {
    settings: DebugSettingsProps;
  };
