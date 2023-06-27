//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ClientPlugin } from '@braneframe/plugin-client';
import { GraphPlugin } from '@braneframe/plugin-graph';
import { MarkdownPlugin } from '@braneframe/plugin-markdown';
import { SplitViewPlugin } from '@braneframe/plugin-splitview';
import { ThemePlugin } from '@braneframe/plugin-theme';
import { TreeViewPlugin } from '@braneframe/plugin-treeview';
import { UrlSyncPlugin } from '@braneframe/plugin-url-sync';
import { Config, Defaults } from '@dxos/config';
import { initializeAppTelemetry } from '@dxos/react-appkit/telemetry';
import { PluginContextProvider } from '@dxos/react-surface';

import { LocalFilesPlugin, GithubPlugin, SpacePlugin } from './plugins';

void initializeAppTelemetry({ namespace: 'composer-app', config: new Config(Defaults()) });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PluginContextProvider
      plugins={[
        ThemePlugin,
        ClientPlugin,
        GraphPlugin,
        TreeViewPlugin,
        UrlSyncPlugin,
        SplitViewPlugin,
        SpacePlugin,
        MarkdownPlugin,
        GithubPlugin,
        LocalFilesPlugin,
      ]}
    />
  </StrictMode>,
);
