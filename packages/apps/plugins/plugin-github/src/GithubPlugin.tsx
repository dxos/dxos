//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { isMarkdown, isMarkdownProperties } from '@braneframe/plugin-markdown';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { LocalStorageStore } from '@dxos/local-storage';
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

export type GithubSettingsProps = {
  pat: string;
};

export type GithubPluginProvides = TranslationsProvides & {
  settings: GithubSettingsProps;
};

export const GithubPlugin = (): PluginDefinition<GithubPluginProvides> => {
  const settings = new LocalStorageStore<GithubSettingsProps>();

  return {
    meta: {
      id: 'dxos.org/plugin/github',
      shortId: 'github',
    },
    ready: async () => {
      settings.bind(settings.values.$pat!, 'braneframe.plugin-github.pat', LocalStorageStore.string);
    },
    unload: async () => {
      settings.close();
    },
    provides: {
      settings: settings.values,
      translations,
      context: (props) => <OctokitProvider {...props} />,
      component: (data, role) => {
        switch (role) {
          case 'dialog':
            switch (true) {
              case data === 'dxos.org/plugin/splitview/ProfileSettings':
                return PatInput;
              case Array.isArray(data) && data[0] === 'dxos.org/plugin/github/BindDialog':
                return UrlDialog;
              case Array.isArray(data) && data[0] === 'dxos.org/plugin/github/ExportDialog':
                return ExportDialog;
              case Array.isArray(data) && data[0] === 'dxos.org/plugin/github/ImportDialog':
                return ImportDialog;
              default:
                return null;
            }
          case 'menuitem':
            return Array.isArray(data) && isMarkdown(data[0]) && isMarkdownProperties(data[1]) && !data[1].readOnly
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
        embedded: EmbeddedMain,
      },
    },
  };
};
