//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type PluginDefinition, type TranslationsProvides, type SurfaceProvides } from '@dxos/app-framework';

import { StatusBarImpl } from './components';
import meta from './meta';
import translations from './translations';

export type StatusBarPluginProvides = SurfaceProvides & TranslationsProvides;

// -- Root plugin definition.
export const StatusBarPlugin = (): PluginDefinition<StatusBarPluginProvides> => {
  return {
    meta,
    provides: {
      translations,
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'status-bar': {
              return <StatusBarImpl />;
            }
          }

          return null;
        },
      },
    },
  };
};
