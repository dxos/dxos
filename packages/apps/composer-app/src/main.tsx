//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ClientPlugin } from '@braneframe/plugin-client';
import { DndPlugin } from '@braneframe/plugin-dnd';
import { GraphPlugin } from '@braneframe/plugin-graph';
import { MarkdownPlugin } from '@braneframe/plugin-markdown';
import { SpacePlugin } from '@braneframe/plugin-space';
import { SplitViewPlugin } from '@braneframe/plugin-splitview';
import { StackPlugin } from '@braneframe/plugin-stack';
import { ThemePlugin } from '@braneframe/plugin-theme';
import { TreeViewPlugin } from '@braneframe/plugin-treeview';
import { UrlSyncPlugin } from '@braneframe/plugin-url-sync';
import { initializeAppTelemetry } from '@dxos/react-appkit/telemetry';
import { Config, Defaults } from '@dxos/react-client';
import { TypedObject } from '@dxos/react-client/echo';
import { PluginContextProvider } from '@dxos/react-surface';

import { GithubPlugin, LocalFilesPlugin } from './plugins';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[TypedObject.name] = TypedObject;

void initializeAppTelemetry({ namespace: 'composer-app', config: new Config(Defaults()) });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PluginContextProvider
      plugins={[
        ThemePlugin(),
        DndPlugin(),
        ClientPlugin(),
        GraphPlugin(),
        TreeViewPlugin(),
        UrlSyncPlugin(),
        SplitViewPlugin(),
        SpacePlugin(),
        MarkdownPlugin(),
        StackPlugin(),
        GithubPlugin(),
        LocalFilesPlugin(),
      ]}
    />
  </StrictMode>,
);
