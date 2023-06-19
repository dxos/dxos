//
// Copyright 2023 DXOS.org
//
// import React from 'react';

import React from 'react';

import { definePlugin, PluginDefinition } from '@dxos/react-surface';

import { isMarkdown, isMarkdownProperties } from '../MarkdownPlugin';
import { MarkdownActions, OctokitProvider, PatInput } from './components';
import { ExportDialog } from './components/ExportDialog';
import { UrlDialog } from './components/UrlDialog';
import translations from './translations';

export const GithubPlugin: PluginDefinition = definePlugin({
  meta: {
    id: 'dxos:GithubPlugin',
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
            case Array.isArray(datum) && datum[0] === 'dxos:githubPlugin/BindDialog':
              return UrlDialog;
            case Array.isArray(datum) && datum[0] === 'dxos:githubPlugin/ExportDialog':
              return ExportDialog;
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
  },
});
