//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { Config, Defaults } from '@dxos/config';
import { initializeAppTelemetry } from '@dxos/react-appkit/telemetry';
import {
  ClientPlugin,
  GraphPlugin,
  PluginContextProvider,
  RoutesPlugin,
  SplitViewPlugin,
  ThemePlugin,
  TreeViewPlugin,
} from '@dxos/react-surface';

import { GithubMarkdownPlugin, SpacePlugin } from './plugins';

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
        GithubMarkdownPlugin,
      ]}
    />
  </StrictMode>,
);
