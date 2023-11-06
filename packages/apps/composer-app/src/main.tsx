//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// import { ChessPlugin } from '@braneframe/plugin-chess';
// import { ClientPlugin } from '@braneframe/plugin-client';
// import { DebugPlugin } from '@braneframe/plugin-debug';
// import { ErrorPlugin } from '@braneframe/plugin-error';
// import { ExplorerPlugin } from '@braneframe/plugin-explorer';
// import { FilesPlugin } from '@braneframe/plugin-files';
// import { GithubPlugin } from '@braneframe/plugin-github';
// import { GraphPlugin } from '@braneframe/plugin-graph';
// import { GridPlugin } from '@braneframe/plugin-grid';
// import { IpfsPlugin } from '@braneframe/plugin-ipfs';
// import { KanbanPlugin } from '@braneframe/plugin-kanban';
// import { LayoutPlugin } from '@braneframe/plugin-layout';
// import { MapPlugin } from '@braneframe/plugin-map';
// import { MarkdownPlugin } from '@braneframe/plugin-markdown';
// import { MetadataPlugin } from '@braneframe/plugin-metadata';
// import { NavTreePlugin } from '@braneframe/plugin-navtree';
// import { PresenterPlugin } from '@braneframe/plugin-presenter';
// import { PwaPlugin } from '@braneframe/plugin-pwa';
// import { ScriptPlugin } from '@braneframe/plugin-script';
// import { SearchPlugin } from '@braneframe/plugin-search';
// import { SketchPlugin } from '@braneframe/plugin-sketch';
// import { SpacePlugin } from '@braneframe/plugin-space';
// import { StackPlugin } from '@braneframe/plugin-stack';
// import { TablePlugin } from '@braneframe/plugin-table';
// import { TelemetryPlugin } from '@braneframe/plugin-telemetry';
// import { ThemePlugin } from '@braneframe/plugin-theme';
// import { ThreadPlugin } from '@braneframe/plugin-thread';
import ClientMeta from '@braneframe/plugin-client/meta';
import ErrorMeta from '@braneframe/plugin-error/meta';
import GraphMeta from '@braneframe/plugin-graph/meta';
import LayoutMeta from '@braneframe/plugin-layout/meta';
import MarkdownMeta from '@braneframe/plugin-markdown/meta';
import MetadataMeta from '@braneframe/plugin-metadata/meta';
import NavTreeMeta from '@braneframe/plugin-navtree/meta';
import PwaMeta from '@braneframe/plugin-pwa/meta';
import RegistryMeta from '@braneframe/plugin-registry/meta';
import SpaceMeta from '@braneframe/plugin-space/meta';
import StackMeta from '@braneframe/plugin-stack/meta';
import TelemetryMeta from '@braneframe/plugin-telemetry/meta';
import ThemeMeta from '@braneframe/plugin-theme/meta';
import { types, Document } from '@braneframe/types';
import { createApp, LayoutAction, Plugin } from '@dxos/app-framework';
import { createClientServices, Config, Defaults, Envs, Local } from '@dxos/react-client';
import { EchoDatabase, SpaceProxy, TextObject, TypedObject } from '@dxos/react-client/echo';
import { ProgressBar } from '@dxos/react-ui';

// @ts-ignore
// import mainUrl from './frame?url';
import { INITIAL_CONTENT, INITIAL_TITLE } from './initialContent';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[TypedObject.name] = TypedObject;
(globalThis as any)[EchoDatabase.name] = EchoDatabase;
(globalThis as any)[SpaceProxy.name] = SpaceProxy;

const appKey = 'composer.dxos.org';

const main = async () => {
  const config = new Config(Envs(), Local(), Defaults());
  const services = await createClientServices(config);
  const App = createApp({
    fallback: (
      <div className='flex h-screen justify-center items-center'>
        <ProgressBar indeterminate />
      </div>
    ),
    order: [
      // Needs to run ASAP on startup (but not blocking).
      TelemetryMeta,
      // Outside of error boundary so error dialog is styled.
      ThemeMeta,
      // Outside of error boundary so that updates are not blocked by errors.
      PwaMeta,
      // TODO(wittjosiah): Factor out to app framework.
      ErrorMeta,

      // UX
      LayoutMeta,
      NavTreeMeta,

      // Data integrations
      ClientMeta,
      SpaceMeta,
      // DebugPlugin(),
      // FilesPlugin(),
      // GithubPlugin(),
      // IpfsPlugin(),

      // Framework extensions
      // TODO(wittjosiah): Space plugin currently needs to be before the Graph plugin.
      //  Root folder needs to be created before the graph is built or else it's not ordered first.
      GraphMeta,
      MetadataMeta,
      RegistryMeta,

      // Presentation
      // PresenterPlugin(), // Before Stack.
      StackMeta,
      MarkdownMeta,
      // SketchPlugin(),
      // GridPlugin(),
      // KanbanPlugin(),
      // MapPlugin(),
      // ScriptPlugin({ mainUrl }),
      // TablePlugin(),
      // ThreadPlugin(),
      // ExplorerPlugin(),
      // ChessPlugin(),
      // // TODO(burdon): Currently last so that action are added at end of dropdown menu.
      // SearchPlugin(),
    ],
    plugins: {
      [ClientMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-client'), { appKey, config, services, types }),
      [ErrorMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-error')),
      [GraphMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-graph')),
      [LayoutMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-layout')),
      [MarkdownMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-markdown')),
      [MetadataMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-metadata')),
      [NavTreeMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-navtree')),
      [PwaMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-pwa')),
      [RegistryMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-registry')),
      [SpaceMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-space'), {
        onFirstRun: ({ personalSpaceFolder, dispatch }) => {
          const document = new Document({ title: INITIAL_TITLE, content: new TextObject(INITIAL_CONTENT) });
          personalSpaceFolder.objects.push(document);

          void dispatch({
            action: LayoutAction.ACTIVATE,
            data: { id: document.id },
          });
        },
      }),
      [StackMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-stack')),
      [TelemetryMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-telemetry'), {
        namespace: appKey,
        config: new Config(Defaults()),
      }),
      [ThemeMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-theme')),
    },
    core: [
      ClientMeta.id,
      ErrorMeta.id,
      GraphMeta.id,
      LayoutMeta.id,
      MetadataMeta.id,
      NavTreeMeta.id,
      PwaMeta.id,
      RegistryMeta.id,
      SpaceMeta.id,
      ThemeMeta.id,
      TelemetryMeta.id,
    ],
    defaults: [MarkdownMeta.id, StackMeta.id],
  });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void main();
