//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import ChainMeta from '@braneframe/plugin-chain/meta';
import ChessMeta from '@braneframe/plugin-chess/meta';
import ClientMeta from '@braneframe/plugin-client/meta';
import DebugMeta from '@braneframe/plugin-debug/meta';
import ErrorMeta from '@braneframe/plugin-error/meta';
import ExplorerMeta from '@braneframe/plugin-explorer/meta';
import FilesMeta from '@braneframe/plugin-files/meta';
import GithubMeta from '@braneframe/plugin-github/meta';
import GraphMeta from '@braneframe/plugin-graph/meta';
import GridMeta from '@braneframe/plugin-grid/meta';
import InboxMeta from '@braneframe/plugin-inbox/meta';
import IpfsMeta from '@braneframe/plugin-ipfs/meta';
import KanbanMeta from '@braneframe/plugin-kanban/meta';
import LayoutMeta from '@braneframe/plugin-layout/meta';
import MapMeta from '@braneframe/plugin-map/meta';
import MarkdownMeta from '@braneframe/plugin-markdown/meta';
import MermaidMeta from '@braneframe/plugin-mermaid/meta';
import MetadataMeta from '@braneframe/plugin-metadata/meta';
import NavTreeMeta from '@braneframe/plugin-navtree/meta';
import OutlinerMeta from '@braneframe/plugin-outliner/meta';
import PresenterMeta from '@braneframe/plugin-presenter/meta';
import PwaMeta from '@braneframe/plugin-pwa/meta';
import RegistryMeta from '@braneframe/plugin-registry/meta';
import ScriptMeta from '@braneframe/plugin-script/meta';
import SearchMeta from '@braneframe/plugin-search/meta';
import SketchMeta from '@braneframe/plugin-sketch/meta';
import SpaceMeta from '@braneframe/plugin-space/meta';
import StackMeta from '@braneframe/plugin-stack/meta';
import TableMeta from '@braneframe/plugin-table/meta';
import TelemetryMeta from '@braneframe/plugin-telemetry/meta';
import ThemeMeta from '@braneframe/plugin-theme/meta';
import ThreadMeta from '@braneframe/plugin-thread/meta';
import WildcardMeta from '@braneframe/plugin-wildcard/meta';
import { types, Document } from '@braneframe/types';
import { createApp, LayoutAction, Plugin } from '@dxos/app-framework';
import { createClientServices, Config, Defaults, Envs, Local, Remote } from '@dxos/react-client';
import { TextObject } from '@dxos/react-client/echo';
import { Status, ThemeProvider } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';

import { appKey } from './globals';
import { INITIAL_CONTENT, INITIAL_TITLE } from './initialContent';
import { initializeNativeApp } from './native';

const main = async () => {
  const searchParams = new URLSearchParams(window.location.search);
  // TODO(burdon): Add monolithic flag. Currently, can set `target=file://local`.
  const config = new Config(Remote(searchParams.get('target') ?? undefined), Envs(), Local(), Defaults());
  const services = await createClientServices(config);
  const debugIdentity = config?.values.runtime?.app?.env?.DX_DEBUG;

  const App = createApp({
    fallback: (
      <ThemeProvider tx={defaultTx}>
        <div className='flex bs-[100dvh] justify-center items-center'>
          <Status indeterminate aria-label='Initializing' />
        </div>
      </ThemeProvider>
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
      DebugMeta,
      FilesMeta,
      GithubMeta,
      IpfsMeta,

      // Framework extensions
      // TODO(wittjosiah): Space plugin currently needs to be before the Graph plugin.
      //  Root folder needs to be created before the graph is built or else it's not ordered first.
      GraphMeta,
      MetadataMeta,
      RegistryMeta,

      // Presentation
      ChainMeta,
      StackMeta,
      PresenterMeta,
      MarkdownMeta,
      MermaidMeta,
      SketchMeta,
      GridMeta,
      InboxMeta,
      KanbanMeta,
      MapMeta,
      OutlinerMeta,
      ScriptMeta,
      TableMeta,
      ThreadMeta,
      ExplorerMeta,
      ChessMeta,
      WildcardMeta,
      // TODO(burdon): Currently last so that the search action is added at end of dropdown menu.
      SearchMeta,
    ],
    plugins: {
      [ChainMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-chain')),
      [ChessMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-chess')),
      [ClientMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-client'), {
        appKey,
        config,
        services,
        types,
        debugIdentity,
      }),
      [DebugMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-debug')),
      [ErrorMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-error')),
      [ExplorerMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-explorer')),
      [FilesMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-files')),
      [GithubMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-github')),
      [GraphMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-graph')),
      [GridMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-grid')),
      [InboxMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-inbox')),
      [IpfsMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-ipfs')),
      [KanbanMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-kanban')),
      [LayoutMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-layout')),
      [MapMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-map')),
      [MarkdownMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-markdown')),
      [MermaidMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-mermaid')),
      [MetadataMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-metadata')),
      [NavTreeMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-navtree')),
      [OutlinerMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-outliner')),
      [PresenterMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-presenter')),
      [PwaMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-pwa')),
      [RegistryMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-registry')),
      [ScriptMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-script'), {
        containerUrl: '/script-frame/index.html',
      }),
      [SearchMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-search')),
      [SketchMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-sketch')),
      [SpaceMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-space'), {
        version: '1',
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
      [TableMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-table')),
      [ThemeMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-theme')),
      [ThreadMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-thread')),
      [WildcardMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-wildcard')),
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
      WildcardMeta.id,
    ],
    defaults: [MarkdownMeta.id, StackMeta.id],
  });

  // TODO(burdon): Better test?
  if ((globalThis as any).__args) {
    void initializeNativeApp();
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void main();
