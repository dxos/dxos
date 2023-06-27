//
// Copyright 2023 DXOS.org
//
// import React from 'react';

import React from 'react';

import { isMarkdown, isMarkdownProperties } from '@braneframe/plugin-markdown';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { PluginDefinition } from '@dxos/react-surface';

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

export const GithubPlugin = (): PluginDefinition<TranslationsProvides> => ({
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
            case datum === 'dxos:splitview/ProfileSettings':
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
          return Array.isArray(datum) && isMarkdown(datum[0]) && isMarkdownProperties(datum[1]) && !datum[1].readOnly
            ? MarkdownActions
            : null;
        default:
          return null;
      }
    },
    components: {
      Main: EmbeddedMain,
    },
  },
});
