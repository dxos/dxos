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
import ExplorerMeta from '@braneframe/plugin-explorer/meta';
import FilesMeta from '@braneframe/plugin-files/meta';
import GithubMeta from '@braneframe/plugin-github/meta';
import GptMeta from '@braneframe/plugin-gpt/meta';
import GraphMeta from '@braneframe/plugin-graph/meta';
import GridMeta from '@braneframe/plugin-grid/meta';
import HelpMeta from '@braneframe/plugin-help/meta';
import InboxMeta from '@braneframe/plugin-inbox/meta';
import IpfsMeta from '@braneframe/plugin-ipfs/meta';
import KanbanMeta from '@braneframe/plugin-kanban/meta';
import LayoutMeta from '@braneframe/plugin-layout/meta';
import MapMeta from '@braneframe/plugin-map/meta';
import MarkdownMeta from '@braneframe/plugin-markdown/meta';
import MermaidMeta from '@braneframe/plugin-mermaid/meta';
import MetadataMeta from '@braneframe/plugin-metadata/meta';
import NativeMeta from '@braneframe/plugin-native/meta';
import NavTreeMeta from '@braneframe/plugin-navtree/meta';
import ObservabilityMeta from '@braneframe/plugin-observability/meta';
import OutlinerMeta from '@braneframe/plugin-outliner/meta';
import PresenterMeta from '@braneframe/plugin-presenter/meta';
import PwaMeta from '@braneframe/plugin-pwa/meta';
import RegistryMeta from '@braneframe/plugin-registry/meta';
import ScriptMeta from '@braneframe/plugin-script/meta';
import SearchMeta from '@braneframe/plugin-search/meta';
import SettingsMeta from '@braneframe/plugin-settings/meta';
import SketchMeta from '@braneframe/plugin-sketch/meta';
import SpaceMeta from '@braneframe/plugin-space/meta';
import StackMeta from '@braneframe/plugin-stack/meta';
import TableMeta from '@braneframe/plugin-table/meta';
import ThemeMeta from '@braneframe/plugin-theme/meta';
import ThreadMeta from '@braneframe/plugin-thread/meta';
import WildcardMeta from '@braneframe/plugin-wildcard/meta';
import { types, Document } from '@braneframe/types';
import { createApp, NavigationAction, Plugin } from '@dxos/app-framework';
import { createStorageObjects } from '@dxos/client-services';
import { defs, SaveConfig } from '@dxos/config';
import { registerSignalRuntime } from '@dxos/echo-signals';
import { log } from '@dxos/log';
import { getObservabilityGroup, initializeAppObservability, isObservabilityDisabled } from '@dxos/observability';
import { createClientServices } from '@dxos/react-client';
import { TextObject } from '@dxos/react-client/echo';
import { Status, ThemeProvider, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';
import './globals';

import { ResetDialog } from './components';
import { setupConfig } from './config';
import { appKey, INITIAL_CONTENT, INITIAL_TITLE } from './constants';
import { steps } from './help';
import translations from './translations';

const main = async () => {
  registerSignalRuntime();

  let config = await setupConfig();

  if (
    !config.values.runtime?.client?.storage?.dataStore &&
    (await defaultStorageIsEmpty(config.values.runtime?.client?.storage))
  ) {
    // NOTE: Set default for first time users to IDB (works better with automerge CRDTs).
    //       Needs to be done before worker is created.
    await SaveConfig({
      runtime: { client: { storage: { dataStore: defs.Runtime.Client.Storage.StorageDriver.IDB } } },
    });
    config = await setupConfig();
  }

  // Intentionally do not await, don't block app startup for telemetry.
  const observability = initializeAppObservability({ namespace: appKey, config });

  // TODO(nf): refactor.
  const observabilityDisabled = await isObservabilityDisabled(appKey);
  const observabilityGroup = await getObservabilityGroup(appKey);

  const services = await createClientServices(
    config,
    config.values.runtime?.app?.env?.DX_HOST
      ? undefined
      : () =>
          new SharedWorker(new URL('@dxos/client/shared-worker', import.meta.url), {
            type: 'module',
            name: 'dxos-client-worker',
          }),
    observabilityGroup,
    !observabilityDisabled,
  );
  const isSocket = !!(globalThis as any).__args;

  const App = createApp({
    fallback: ({ error }) => (
      <ThemeProvider tx={defaultTx} resourceExtensions={translations}>
        <Tooltip.Provider>
          <ResetDialog error={error} config={config} />
        </Tooltip.Provider>
      </ThemeProvider>
    ),
    placeholder: (
      <ThemeProvider tx={defaultTx}>
        <div className='flex bs-[100dvh] justify-center items-center'>
          <Status indeterminate aria-label='Initializing' />
        </div>
      </ThemeProvider>
    ),
    order: [
      // Needs to run ASAP on startup (but not blocking).
      ObservabilityMeta,
      ThemeMeta,
      // TODO(wittjosiah): Consider what happens to PWA updates when hitting error boundary.
      isSocket ? NativeMeta : PwaMeta,

      // UX
      LayoutMeta,
      NavTreeMeta,
      SettingsMeta,
      HelpMeta,

      // Data integrations
      ClientMeta,
      SpaceMeta,
      DebugMeta,
      FilesMeta,
      GithubMeta,
      IpfsMeta,
      GptMeta,

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
        shell: './shell.html',
      }),
      [DebugMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-debug')),
      [ExplorerMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-explorer')),
      [FilesMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-files')),
      [GithubMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-github')),
      [GptMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-gpt')),
      [GraphMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-graph')),
      [GridMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-grid')),
      [HelpMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-help'), {
        steps,
      }),
      [InboxMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-inbox')),
      [IpfsMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-ipfs')),
      [KanbanMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-kanban')),
      [LayoutMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-layout'), {
        observability: true,
      }),
      [MapMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-map')),
      [MarkdownMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-markdown')),
      [MermaidMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-mermaid')),
      [MetadataMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-metadata')),
      ...(isSocket
        ? { [NativeMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-native')) }
        : { [PwaMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-pwa')) }),
      [NavTreeMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-navtree')),
      [OutlinerMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-outliner')),
      [PresenterMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-presenter')),
      [RegistryMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-registry')),
      [ScriptMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-script'), {
        containerUrl: '/script-frame/index.html',
      }),
      [SearchMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-search')),
      [SettingsMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-settings')),
      [SketchMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-sketch')),
      [SpaceMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-space'), {
        onFirstRun: ({ personalSpaceFolder, dispatch }) => {
          const document = new Document({ title: INITIAL_TITLE, content: new TextObject(INITIAL_CONTENT) });
          personalSpaceFolder.objects.push(document);
          void dispatch({
            action: NavigationAction.ACTIVATE,
            data: { id: document.id },
          });
        },
      }),
      [StackMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-stack')),
      [ObservabilityMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-observability'), {
        namespace: appKey,
        observability: () => observability,
      }),
      [TableMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-table')),
      [ThemeMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-theme'), {
        appName: 'Composer',
      }),
      [ThreadMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-thread')),
      [WildcardMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-wildcard')),
    },
    core: [
      ClientMeta.id,
      GraphMeta.id,
      HelpMeta.id,
      LayoutMeta.id,
      MetadataMeta.id,
      NavTreeMeta.id,
      ...(isSocket ? [NativeMeta.id] : [PwaMeta.id]),
      RegistryMeta.id,
      SettingsMeta.id,
      SpaceMeta.id,
      ThemeMeta.id,
      ObservabilityMeta.id,
      WildcardMeta.id,
    ],
    // TODO(burdon): Add DebugMeta if dev build.
    defaults: [MarkdownMeta.id, StackMeta.id, ThreadMeta.id, SketchMeta.id],
  });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

const defaultStorageIsEmpty = async (config?: defs.Runtime.Client.Storage): Promise<boolean> => {
  try {
    const storage = createStorageObjects(config ?? {}).storage;
    const metadataDir = storage.createDirectory('metadata');
    const echoMetadata = metadataDir.getOrCreateFile('EchoMetadata');
    const { size } = await echoMetadata.stat();
    return !(size > 0);
  } catch (err) {
    log.warn('Checking for empty default storage.', { err });
    return true;
  }
};

void main();
