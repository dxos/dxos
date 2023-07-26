//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ClientPlugin } from '@braneframe/plugin-client';
import { DebugPlugin } from '@braneframe/plugin-debug';
import { DndPlugin } from '@braneframe/plugin-dnd';
import { DrawingPlugin } from '@braneframe/plugin-drawing';
import { ErrorPlugin } from '@braneframe/plugin-error';
import { FilesPlugin } from '@braneframe/plugin-files';
import { GithubPlugin } from '@braneframe/plugin-github';
import { GraphPlugin } from '@braneframe/plugin-graph';
import { IntentPlugin } from '@braneframe/plugin-intent';
import { KanbanPlugin } from '@braneframe/plugin-kanban';
import { MarkdownPlugin } from '@braneframe/plugin-markdown';
import { PwaPlugin } from '@braneframe/plugin-pwa';
import { SpacePlugin } from '@braneframe/plugin-space';
import { SplitViewPlugin } from '@braneframe/plugin-splitview';
import { StackPlugin } from '@braneframe/plugin-stack';
import { ThemePlugin } from '@braneframe/plugin-theme';
import { ThreadPlugin } from '@braneframe/plugin-thread';
import { TreeViewPlugin } from '@braneframe/plugin-treeview';
import { UrlSyncPlugin } from '@braneframe/plugin-url-sync';
import { SpaceProxy } from '@dxos/client/echo';
import { Config, Defaults } from '@dxos/config';
import { EchoDatabase, TypedObject } from '@dxos/echo-schema';
import { initializeAppTelemetry } from '@dxos/react-appkit/telemetry';
import { PluginContextProvider } from '@dxos/react-surface';

// TODO(wittjosiah): This ensures that typed objects and SpaceProxy are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[TypedObject.name] = TypedObject;
(globalThis as any)[EchoDatabase.name] = EchoDatabase;
(globalThis as any)[SpaceProxy.name] = SpaceProxy;

void initializeAppTelemetry({ namespace: 'labs-app', config: new Config(Defaults()) });

// TODO(burdon): Move GH plugins out of composer.
// TODO(burdon): Rename aurora-composer => aurora-editor.
// TODO(burdon): Remove plugin deps on composer (e.g., translations).

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PluginContextProvider
      plugins={[
        IntentPlugin(),
        ThemePlugin('Labs'),
        ClientPlugin(),
        DndPlugin(),
        // Outside of error boundary so that updates are not blocked by errors.
        PwaPlugin(),
        // Inside theme provider so that errors are styled.
        ErrorPlugin(),
        GraphPlugin(),
        TreeViewPlugin(),
        UrlSyncPlugin(),
        SplitViewPlugin(),
        SpacePlugin(),
        MarkdownPlugin(),
        StackPlugin(),
        GithubPlugin(),
        FilesPlugin(),
        DrawingPlugin(),
        KanbanPlugin(),
        ThreadPlugin(),
        DebugPlugin(),
      ]}
    />
  </StrictMode>,
);
