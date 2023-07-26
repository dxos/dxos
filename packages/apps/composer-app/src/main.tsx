//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ClientPlugin } from '@braneframe/plugin-client';
import { DndPlugin } from '@braneframe/plugin-dnd';
import { ErrorPlugin } from '@braneframe/plugin-error';
import { FilesPlugin } from '@braneframe/plugin-files';
import { GithubPlugin } from '@braneframe/plugin-github';
import { GraphPlugin } from '@braneframe/plugin-graph';
import { IntentPlugin } from '@braneframe/plugin-intent';
import { MarkdownPlugin } from '@braneframe/plugin-markdown';
import { PwaPlugin } from '@braneframe/plugin-pwa';
import { SpacePlugin } from '@braneframe/plugin-space';
import { SplitViewPlugin } from '@braneframe/plugin-splitview';
import { StackPlugin } from '@braneframe/plugin-stack';
import { ThemePlugin } from '@braneframe/plugin-theme';
import { TreeViewPlugin } from '@braneframe/plugin-treeview';
import { UrlSyncPlugin } from '@braneframe/plugin-url-sync';
import { Config, Defaults } from '@dxos/config';
import { TypedObject } from '@dxos/echo-schema';
import { initializeAppTelemetry } from '@dxos/react-appkit/telemetry';
import { PluginContextProvider } from '@dxos/react-surface';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[TypedObject.name] = TypedObject;

void initializeAppTelemetry({ namespace: 'composer-app', config: new Config(Defaults()) });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PluginContextProvider
      plugins={[
        IntentPlugin(),
        ThemePlugin('Composer'),
        DndPlugin(),
        // Outside of error boundary so that updates are not blocked by errors.
        PwaPlugin(),
        // Inside theme provider so that errors are styled.
        ErrorPlugin(),
        ClientPlugin(),
        GraphPlugin(),
        TreeViewPlugin(),
        UrlSyncPlugin(),
        SplitViewPlugin(),
        SpacePlugin(),
        MarkdownPlugin(),
        StackPlugin(),
        GithubPlugin(),
        FilesPlugin(),
      ]}
    />
  </StrictMode>,
);
