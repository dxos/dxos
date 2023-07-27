//
// Copyright 2023 DXOS.org
//

import { Context, createContext } from 'react';

import type { GraphProvides } from '@braneframe/plugin-graph';
import type { TranslationsProvides } from '@braneframe/plugin-theme';

export const DEBUG_PANEL = 'dxos.org/plugin/debug';

export type DebugContextType = {
  running: boolean;
  start: (cb: () => void, period: number) => void;
  stop: () => void;
};

export const DebugContext: Context<DebugContextType> = createContext<DebugContextType>({
  running: false,
  start: () => {},
  stop: () => {},
});

export type DebugPluginProvides = GraphProvides & TranslationsProvides;
