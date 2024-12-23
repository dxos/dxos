//
// Copyright 2024 DXOS.org
//

import React from 'react';

import {
  createSurface,
  type PluginDefinition,
  type SurfaceProvides,
  type TranslationsProvides,
} from '@dxos/app-framework';

import { StatusBarPanel } from './components';
import meta from './meta';
import translations from './translations';

export type StatusBarPluginProvides = SurfaceProvides & TranslationsProvides;

export const StatusBarPlugin = (): PluginDefinition<StatusBarPluginProvides> => {
  return {
    meta,
    provides: {
      translations,
      surface: {
        definitions: () =>
          createSurface({
            id: meta.id,
            role: 'status-bar',
            component: () => <StatusBarPanel />,
          }),
      },
    },
  };
};
