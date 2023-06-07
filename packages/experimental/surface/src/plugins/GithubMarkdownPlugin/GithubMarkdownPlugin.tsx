//
// Copyright 2023 DXOS.org
//
// import React from 'react';

import React from 'react-router';

import { Document } from '@braneframe/types';

import { definePlugin, PluginDefinition, Surface } from '../../framework';
import { isSpace } from '../SpacePlugin';
import { MainAll, MainOne, OctokitProvider } from './components';

export const isDocument = (datum: any): datum is Document => {
  return 'type' in datum && 'name' in datum.type && Document.type.name === datum.type.name;
};

export const GithubMarkdownPlugin: PluginDefinition = definePlugin({
  meta: {
    id: 'dxos:GithubMarkdownPlugin',
  },
  provides: {
    context: (props) => <OctokitProvider {...props} />,
    router: {
      routes: () => [
        {
          path: '/document/:spaceSlug/:documentSlug',
          element: (
            <Surface
              component='dxos:SplitViewPlugin/SplitView'
              surfaces={{
                sidebar: { component: 'dxos:ListViewPlugin/ListView' },
                main: { component: 'dxos:GithubMarkdownPlugin/MainOne' },
              }}
            />
          ),
        },
      ],
    },
    component: (datum, role) => {
      if (role === 'main') {
        switch (true) {
          case isSpace(datum):
            return MainAll;
          case isDocument(datum):
            return MainOne;
          default:
            return null;
        }
      } else {
        return null;
      }
    },
    components: {
      MainAll,
      MainOne,
    },
  },
});
