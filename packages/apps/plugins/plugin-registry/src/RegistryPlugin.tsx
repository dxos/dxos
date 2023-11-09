//
// Copyright 2023 DXOS.org
//

import React from 'react';

import type { PluginDefinition, SurfaceProvides, TranslationsProvides } from '@dxos/app-framework';

import { Settings } from './components';
import meta from './meta';
import translations from './translations';

export type RegistryPluginProvides = SurfaceProvides & TranslationsProvides;

export const RegistryPlugin = (): PluginDefinition<RegistryPluginProvides> => {
  return {
    meta,
    provides: {
      translations,
      surface: {
        component: ({ role }) => {
          switch (role) {
            case 'settings':
              return <Settings />;
          }
        },
      },
    },
  };
};
