//
// Copyright 2023 DXOS.org
//
// import React from 'react';

import React from 'react';

import { isMarkdown, isMarkdownProperties } from '@braneframe/plugin-markdown';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { useTelemetry } from '@dxos/react-appkit';
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
    id: 'dxos.org/plugin/github',
    shortId: 'github',
  },
  provides: {
    translations,
    context: (props) => <OctokitProvider {...props} />,
    component: (datum, role) => {
      switch (role) {
        case 'dialog':
          switch (true) {
            case datum === 'dxos.org/plugin/splitview/ProfileSettings':
              return PatInput;
            case Array.isArray(datum) && datum[0] === 'dxos.org/plugin/github/BindDialog':
              return UrlDialog;
            case Array.isArray(datum) && datum[0] === 'dxos.org/plugin/github/ExportDialog':
              return ExportDialog;
            case Array.isArray(datum) && datum[0] === 'dxos.org/plugin/github/ImportDialog':
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
      default: () => {
        // TODO(wittjosiah): Factor out to a telemetry plugin.
        useTelemetry({ namespace: 'composer-app', router: false });

        return null;
      },
      Main: EmbeddedMain,
    },
  },
});
