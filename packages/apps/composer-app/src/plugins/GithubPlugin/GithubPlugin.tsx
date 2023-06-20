//
// Copyright 2023 DXOS.org
//
// import React from 'react';

import React from 'react';

import { definePlugin, PluginDefinition, Surface } from '@dxos/react-surface';

import { isMarkdown, isMarkdownProperties } from '../MarkdownPlugin';
import {
  MarkdownActions,
  OctokitProvider,
  PatInput,
  EmbeddedMain,
  ExportDialog,
  ImportDialog,
  UrlDialog,
} from './components';
import translations from './translations';

export const GithubPlugin: PluginDefinition = definePlugin({
  meta: {
    id: 'dxos:github',
  },
  provides: {
    translations,
    context: (props) => <OctokitProvider {...props} />,
    component: (datum, role) => {
      switch (role) {
        case 'dialog':
          switch (true) {
            case datum === 'dxos:SplitViewPlugin/ProfileSettings':
              return PatInput;
            case Array.isArray(datum) && datum[0] === 'dxos:github/BindDialog':
              return UrlDialog;
            case Array.isArray(datum) && datum[0] === 'dxos:github/ExportDialog':
              return ExportDialog;
            case Array.isArray(datum) && datum[0] === 'dxos:github/ImportDialog':
              return ImportDialog;
            default:
              return null;
          }
        case 'menuitem':
          return Array.isArray(datum) && isMarkdown(datum[0]) && isMarkdownProperties(datum[1])
            ? MarkdownActions
            : null;
        default:
          return null;
      }
    },
    router: {
      routes: () => [
        {
          path: '/embedded',
          element: <Surface component='dxos:github/EmbeddedMain' />,
        },
      ],
    },
    components: {
      EmbeddedMain,
    },
  },
});
