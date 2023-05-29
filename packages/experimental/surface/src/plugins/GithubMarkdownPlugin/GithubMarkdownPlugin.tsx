//
// Copyright 2023 DXOS.org
//
// import React from 'react';

import React from 'react-router';

import { Document } from '@braneframe/types';

import { definePlugin, PluginDefinition, Surface } from '../../framework';
import { isSpace } from '../SpacePlugin';
import { MainAll } from './MainAll';
import { MainOne } from './MainOne';

// import { OctokitProvider } from './OctokitProvider';

export const isDocument = (datum: any): datum is Document => {
  return 'type' in datum && 'name' in datum.type && Document.type.name === datum.type.name;
};

export const GithubMarkdownPlugin: PluginDefinition = definePlugin({
  meta: {
    id: 'dxos:GithubMarkdownPlugin',
  },
  provides: {
    // context: ({ children }) => {
    //   return <OctokitProvider>{children}</OctokitProvider>;
    // },
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
    component: (arg: any) => {
      if (Array.isArray(arg)) {
        const [datum, surfaceType] = arg;
        switch (true) {
          case isSpace(datum) && surfaceType === 'main':
            return MainAll;
          case isDocument(datum) && surfaceType === 'main':
            return MainOne;
          default:
            return undefined;
        }
      } else {
        return undefined;
      }
    },
    components: {
      MainAll,
      MainOne,
    },
  },
});
