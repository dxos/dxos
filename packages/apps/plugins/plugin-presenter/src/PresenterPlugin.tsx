//
// Copyright 2023 DXOS.org
//

import { type PluginDefinition } from '@dxos/react-surface';

import translations from './translations';
import { PRESENTER_PLUGIN, type PresenterPluginProvides } from './types';

export const PresenterPlugin = (): PluginDefinition<PresenterPluginProvides> => {
  return {
    meta: {
      id: PRESENTER_PLUGIN,
    },
    provides: {
      translations,
      intent: {
        resolver: () => {},
      },
    },
  };
};
