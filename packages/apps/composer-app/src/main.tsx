//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ClientPlugin } from '@braneframe/plugin-client';
import { MarkdownPlugin } from '@braneframe/plugin-markdown';
import { Config, Defaults } from '@dxos/config';
import { initializeAppTelemetry } from '@dxos/react-appkit/telemetry';
import {
  GraphPlugin,
  PluginContextProvider,
  RoutesPlugin,
  SplitViewPlugin,
  ThemePlugin,
  TreeViewPlugin,
} from '@dxos/react-surface';

import { LocalFilesPlugin, GithubPlugin, SpacePlugin } from './plugins';

void initializeAppTelemetry({ namespace: 'composer-app', config: new Config(Defaults()) });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PluginContextProvider
      plugins={[
        RoutesPlugin,
        ThemePlugin,
        ClientPlugin,
        GraphPlugin,
        TreeViewPlugin,
        SplitViewPlugin,
        SpacePlugin,
        MarkdownPlugin,
        GithubPlugin,
        LocalFilesPlugin,
      ]}
    />
  </StrictMode>,
);
