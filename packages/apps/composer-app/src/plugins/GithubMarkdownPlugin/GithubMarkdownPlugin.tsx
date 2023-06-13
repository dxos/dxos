//
// Copyright 2023 DXOS.org
//
// import React from 'react';

import React from 'react';

import { Document } from '@braneframe/types';
import { isTypedObject } from '@dxos/react-client';
import { definePlugin, PluginDefinition, Surface } from '@dxos/react-surface';

import { isSpace } from '../SpacePlugin';
import { EmbeddedMain, OctokitProvider, PatInput, StandaloneMain } from './components';

export const isDocument = (datum: unknown): datum is Document =>
  isTypedObject(datum) && Document.type.name === datum.__typename;

export const GithubMarkdownPlugin: PluginDefinition = definePlugin({
  meta: {
    id: 'dxos:GithubMarkdownPlugin',
  },
  provides: {
    router: {
      routes: () => [
        {
          path: '/embedded',
          element: <Surface component='dxos:GithubMarkdownPlugin/EmbeddedMain' />,
        },
      ],
    },
    context: (props) => <OctokitProvider {...props} />,
    component: (datum, role) => {
      if (Array.isArray(datum) && role === 'main') {
        const [parentDatum, childDatum] = datum;
        switch (true) {
          case isDocument(childDatum) && isSpace(parentDatum):
            return StandaloneMain;
          default:
            return null;
        }
      } else if (role === 'dialog' && datum === 'dxos:SplitViewPlugin/ProfileSettings') {
        return PatInput;
      } else {
        return null;
      }
    },
    components: {
      EmbeddedMain,
      StandaloneMain,
    },
  },
});
