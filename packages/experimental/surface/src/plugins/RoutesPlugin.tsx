//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useRoutes } from 'react-router';
import { HashRouter } from 'react-router-dom';

import { definePlugin, Surface } from '../framework';

export const RoutesPlugin = definePlugin({
  meta: {
    id: 'RoutesPlugin'
  },
  provides: {
    context: ({ children }) => {
      return <HashRouter>{children}</HashRouter>;
    },
    components: {
      default: () => {
        return useRoutes([
          {
            path: '/',
            element: (
              <Surface
                component='dxos:SplitViewPlugin/SplitView'
                surfaces={{ sidebar: { component: 'dxos:ListViewPlugin/ListView' } }}
              />
            )
          },
          // TODO(wittjosiah): Routes should be registered by plugins.
          {
            path: '/space/:spaceId',
            element: (
              <Surface
                component='dxos:SplitViewPlugin/SplitView'
                surfaces={{
                  sidebar: { component: 'dxos:ListViewPlugin/ListView' },
                  main: { component: 'dxos:SpacePlugin/SpaceContainer' }
                }}
              />
            )
          }
        ]);
      }
    }
  }
});
