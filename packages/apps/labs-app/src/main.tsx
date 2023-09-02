//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { ChessPlugin } from '@braneframe/plugin-chess';
import { ClientPlugin } from '@braneframe/plugin-client';
import { DebugPlugin } from '@braneframe/plugin-debug';
import { DndPlugin } from '@braneframe/plugin-dnd';
import { DrawingPlugin } from '@braneframe/plugin-drawing';
import { ErrorPlugin } from '@braneframe/plugin-error';
import { FilesPlugin } from '@braneframe/plugin-files';
import { GithubPlugin } from '@braneframe/plugin-github';
import { GraphPlugin } from '@braneframe/plugin-graph';
import { GridPlugin } from '@braneframe/plugin-grid';
import { IntentPlugin } from '@braneframe/plugin-intent';
import { IpfsPlugin } from '@braneframe/plugin-ipfs';
import { KanbanPlugin } from '@braneframe/plugin-kanban';
import { MarkdownPlugin } from '@braneframe/plugin-markdown';
import { PwaPlugin } from '@braneframe/plugin-pwa';
import { SpacePlugin } from '@braneframe/plugin-space';
import { SplitViewPlugin } from '@braneframe/plugin-splitview';
import { StackPlugin } from '@braneframe/plugin-stack';
import { TemplatePlugin } from '@braneframe/plugin-template';
import { ThemePlugin } from '@braneframe/plugin-theme';
import { ThreadPlugin } from '@braneframe/plugin-thread';
import { TreeViewPlugin } from '@braneframe/plugin-treeview';
import { UrlSyncPlugin } from '@braneframe/plugin-url-sync';
import { SpaceProxy } from '@dxos/client/echo';
import { createClientServices, Remote } from '@dxos/client/services';
import { Config, Envs, Local } from '@dxos/config';
import { EchoDatabase, TypedObject } from '@dxos/echo-schema';
import { initializeAppTelemetry } from '@dxos/react-appkit/telemetry';
import { Defaults } from '@dxos/react-client';
import { PluginProvider } from '@dxos/react-surface';

// TODO(wittjosiah): This ensures that typed objects and SpaceProxy are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[TypedObject.name] = TypedObject;
(globalThis as any)[EchoDatabase.name] = EchoDatabase;
(globalThis as any)[SpaceProxy.name] = SpaceProxy;

const main = async () => {
  const searchParams = new URLSearchParams(window.location.search);
  const config = new Config(Remote(searchParams.get('target') ?? undefined), Envs(), Local(), Defaults());
  const services = await createClientServices(config);
  const debug = config?.values.runtime?.app?.env?.DX_DEBUG;

  // TODO(burdon): Normalize telemetry namespace.
  await initializeAppTelemetry({ namespace: 'labs.dxos.org', config: config! });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <PluginProvider
        plugins={[
          IntentPlugin(),
          ThemePlugin({ appName: 'Labs' }),
          ClientPlugin({ config, services, debugIdentity: debug }),
          IntentPlugin(),
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

          // Composer
          MarkdownPlugin(),
          StackPlugin(),
          GithubPlugin(),
          FilesPlugin(),

          // Labs
          DebugPlugin(),
          GridPlugin(),
          IpfsPlugin(),
          TemplatePlugin(),
          DrawingPlugin(),
          KanbanPlugin(),
          ThreadPlugin(),
          ChessPlugin(),
          TemplatePlugin(),
        ]}
      />
    </StrictMode>,
  );
};

void main();
