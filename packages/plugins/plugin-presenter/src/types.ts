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

import { PRESENTER_PLUGIN } from './meta';

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

export type PresenterSettingsProps = {
  presentCollections?: boolean;
};

export type PresenterPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides &
  SettingsProvides<PresenterSettingsProps>;

export const TOGGLE_PRESENTATION = `${PRESENTER_PLUGIN}/toggle-presentation`;
