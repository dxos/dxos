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

export type PresenterPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides;
