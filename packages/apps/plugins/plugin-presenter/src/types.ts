//
// Copyright 2023 DXOS.org
//

import { type Context, createContext } from 'react';

import type { GraphProvides } from '@braneframe/plugin-graph';
import type { IntentProvides } from '@braneframe/plugin-intent';
import type { TranslationsProvides } from '@braneframe/plugin-theme';

export const PRESENTER_PLUGIN = 'dxos.org/plugin/presenter';

export type PresenterContextType = {
  running: boolean;
  start: () => void;
  stop: () => void;
};

export const PresenterContext: Context<PresenterContextType> = createContext<PresenterContextType>({
  running: false,
  start: () => {},
  stop: () => {},
});

export type PresenterPluginProvides = GraphProvides & IntentProvides & TranslationsProvides;
