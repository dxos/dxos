//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import ChainMeta from '@braneframe/plugin-chain/meta';
import ChessMeta from '@braneframe/plugin-chess/meta';
import ClientMeta from '@braneframe/plugin-client/meta';
import DebugMeta from '@braneframe/plugin-debug/meta';
import DeckMeta from '@braneframe/plugin-deck/meta';
import ExplorerMeta from '@braneframe/plugin-explorer/meta';
import FilesMeta from '@braneframe/plugin-files/meta';
import FunctionMeta from '@braneframe/plugin-function/meta';
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
import StatusBarMeta from '@braneframe/plugin-status-bar/meta';
import TableMeta from '@braneframe/plugin-table/meta';
import ThemeMeta from '@braneframe/plugin-theme/meta';
import ThreadMeta from '@braneframe/plugin-thread/meta';
import WildcardMeta from '@braneframe/plugin-wildcard/meta';
import { createApp, NavigationAction, Plugin } from '@dxos/app-framework';
import { createStorageObjects } from '@dxos/client-services';
import { defs, SaveConfig } from '@dxos/config';
import { registerSignalRuntime } from '@dxos/echo-signals';
import { log } from '@dxos/log';
import { getObservabilityGroup, initializeAppObservability, isObservabilityDisabled } from '@dxos/observability';
import { createClientServices } from '@dxos/react-client';
import { Status, ThemeProvider, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';
import { TRACE_PROCESSOR } from '@dxos/tracing';
import { type JWTPayload } from '@dxos/web-auth';

import './globals';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { meta as BetaMeta } from './beta/BetaPlugin';
import { ResetDialog } from './components';
import { setupConfig } from './config';
import { appKey, INITIAL_CONTENT, INITIAL_TITLE } from './constants';
import { steps } from './help';
import translations from './translations';

const main = async () => {
  TRACE_PROCESSOR.setInstanceTag('app');

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
  const isPwa = config.values.runtime?.app?.env?.DX_PWA !== 'false';
  const isDeck = localStorage.getItem('dxos.org/settings/layout/deck') === 'true';
  const isDev = config.values.runtime?.app?.env?.DX_ENVIRONMENT !== 'production';

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
      BetaMeta,

      // UX
      isDeck ? DeckMeta : LayoutMeta,
      NavTreeMeta,
      SettingsMeta,
      HelpMeta,
      StatusBarMeta,

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
      ChessMeta,
      ExplorerMeta,
      FunctionMeta,
      InboxMeta,
      GridMeta,
      KanbanMeta,
      MapMeta,
      MarkdownMeta,
      MermaidMeta,
      OutlinerMeta,
      PresenterMeta,
      ScriptMeta,
      SketchMeta,
      StackMeta,
      TableMeta,
      ThreadMeta,
      WildcardMeta,

      // TODO(burdon): Currently last so that the search action is added at end of dropdown menu.
      SearchMeta,
    ],
    plugins: {
      [BetaMeta.id]: Plugin.lazy(() => import('./beta/BetaPlugin')),
      [ChainMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-chain')),
      [ChessMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-chess')),
      [ClientMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-client'), {
        appKey,
        config,
        services,
        shell: './shell.html',
        onClientInitialized: async (client) => {
          const url = new URL(window.location.href);
          // Match CF only.
          // TODO(burdon): Check for Server: cloudflare header.
          //  https://developers.cloudflare.com/pages/configuration/serving-pages
          if (!url.origin.endsWith('composer.space')) {
            return;
          }

          try {
            // Retrieve the cookie.
            const response = await fetch('/info');
            if (!response.ok) {
              throw new Error('Invalid response.');
            }

            const result: JWTPayload = await response.json();

            // TODO(burdon): CamelCase vs. _ names.
            await client.shell.setInvitationUrl({
              invitationUrl: new URL(`?access_token=${result.access_token}`, window.location.origin).toString(),
              deviceInvitationParam: 'deviceInvitationCode',
              spaceInvitationParam: 'spaceInvitationCode',
            });
          } catch (err) {
            log.catch(err);
          }
        },
      }),
      [DebugMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-debug')),
      [ExplorerMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-explorer')),
      [FilesMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-files')),
      [FunctionMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-function')),
      [GithubMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-github')),
      [GptMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-gpt')),
      [GraphMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-graph')),
      [GridMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-grid')),
      [HelpMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-help'), { steps }),
      [InboxMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-inbox')),
      [IpfsMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-ipfs')),
      [KanbanMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-kanban')),
      // DX_DECK=1
      ...(isDeck
        ? {
            [DeckMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-deck'), {
              observability: true,
            }),
          }
        : {
            [LayoutMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-layout'), {
              observability: true,
            }),
          }),
      [MapMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-map')),
      [MarkdownMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-markdown')),
      [MermaidMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-mermaid')),
      [MetadataMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-metadata')),
      ...(isSocket ? { [NativeMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-native')) } : {}),
      [NavTreeMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-navtree')),
      [ObservabilityMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-observability'), {
        namespace: appKey,
        observability: () => observability,
      }),
      [OutlinerMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-outliner')),
      [PresenterMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-presenter')),
      ...(!isSocket && isPwa ? { [PwaMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-pwa')) } : {}),
      [RegistryMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-registry')),
      [ScriptMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-script'), {
        containerUrl: '/script-frame/index.html',
      }),
      [SearchMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-search')),
      [SettingsMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-settings')),
      [SketchMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-sketch')),
      [SpaceMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-space'), {
        onFirstRun: async ({ personalSpaceFolder, dispatch }) => {
          const { DocumentType, TextV0Type } = await import('@braneframe/types');
          const { create } = await import('@dxos/echo-schema');
          const { fullyQualifiedId } = await import('@dxos/react-client/echo');
          const content = create(TextV0Type, { content: INITIAL_CONTENT });
          const document = create(DocumentType, { title: INITIAL_TITLE, content });
          personalSpaceFolder.objects.push(document);
          void dispatch({
            action: NavigationAction.OPEN,
            data: { activeParts: { main: [fullyQualifiedId(document)] } },
          });
        },
      }),
      [StatusBarMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-status-bar')),
      [StackMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-stack')),
      [TableMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-table')),
      [ThemeMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-theme'), {
        appName: 'Composer',
      }),
      [ThreadMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-thread')),
      [WildcardMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-wildcard')),
    },
    core: [
      ...(isSocket ? [NativeMeta.id] : []),
      ...(!isSocket && isPwa ? [PwaMeta.id] : []),
      BetaMeta.id,
      ClientMeta.id,
      GraphMeta.id,
      HelpMeta.id,
      isDeck ? DeckMeta.id : LayoutMeta.id,
      MetadataMeta.id,
      NavTreeMeta.id,
      ObservabilityMeta.id,
      RegistryMeta.id,
      SettingsMeta.id,
      SpaceMeta.id,
      StatusBarMeta.id,
      ThemeMeta.id,
      WildcardMeta.id,
    ],
    defaults: [
      // prettier-ignore
      ...(isDev ? [DebugMeta.id] : []),
      MarkdownMeta.id,
      StackMeta.id,
      ThreadMeta.id,
      SketchMeta.id,
    ],
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
