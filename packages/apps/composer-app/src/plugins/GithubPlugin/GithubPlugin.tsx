//
// Copyright 2023 DXOS.org
//
// import React from 'react';

import React from 'react';

import { definePlugin, PluginDefinition } from '@dxos/react-surface';

import { isMarkdown, isMarkdownProperties } from '../MarkdownPlugin';
import { MarkdownActions, OctokitProvider, PatInput } from './components';

export const GithubPlugin: PluginDefinition = definePlugin({
  meta: {
    id: 'dxos:GithubPlugin',
  },
  provides: {
    context: (props) => <OctokitProvider {...props} />,
    component: (datum, role) => {
      switch (role) {
        case 'dialog':
          return datum === 'dxos:SplitViewPlugin/ProfileSettings' ? PatInput : null;
        case 'menuitem':
          return Array.isArray(datum) && isMarkdown(datum[0]) && isMarkdownProperties(datum[1])
            ? MarkdownActions
            : null;
        default:
          return null;
      }
    },
  },
});
