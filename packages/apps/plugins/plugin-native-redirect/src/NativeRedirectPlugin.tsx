//
// Copyright 2023 DXOS.org
//

import React from 'react';

import type { PluginDefinition } from '@dxos/app-framework';

import meta from './meta';

export const NativeRedirectPlugin = (): PluginDefinition => ({
  meta,
  ready: async (plugins) => {
    console.log('native redirect plugin ready');
  },
  provides: {
    surface: {
      component: ({ data, role }) => {
        switch (role) {
          case 'main':
            return <p>Hello</p>;
        }

        return null;
      },
    },
  },
});
