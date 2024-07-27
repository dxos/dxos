//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import AttentionMeta from '@braneframe/plugin-attention/meta';
import ChainMeta from '@braneframe/plugin-chain/meta';
import ChessMeta from '@braneframe/plugin-chess/meta';
import ClientMeta, { CLIENT_PLUGIN, ClientAction } from '@braneframe/plugin-client/meta';
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
import SpaceMeta, { SPACE_PLUGIN, SpaceAction } from '@braneframe/plugin-space/meta';
import StackMeta from '@braneframe/plugin-stack/meta';
import StatusBarMeta from '@braneframe/plugin-status-bar/meta';
import TableMeta from '@braneframe/plugin-table/meta';
import ThemeMeta from '@braneframe/plugin-theme/meta';
import ThreadMeta from '@braneframe/plugin-thread/meta';
import WildcardMeta from '@braneframe/plugin-wildcard/meta';
import { type CollectionType } from '@braneframe/types';
import { createApp, NavigationAction, parseIntentPlugin, Plugin, resolvePlugin } from '@dxos/app-framework';
import { type defs } from '@dxos/config';
import { registerSignalRuntime } from '@dxos/echo-signals';
import { log } from '@dxos/log';
import { getObservabilityGroup, initializeAppObservability, isObservabilityDisabled } from '@dxos/observability';
import { Status, ThemeProvider, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';
import { TRACE_PROCESSOR } from '@dxos/tracing';

import { ResetDialog } from './components';
import { setupConfig } from './config';
import { appKey, INITIAL_CONTENT, INITIAL_TITLE } from './constants';
import { steps } from './help';
import { meta as WelcomeMeta } from './plugins/welcome/meta';
import translations from './translations';
import { removeQueryParamByValue } from './util';

const main = async () => {
  TRACE_PROCESSOR.setInstanceTag('app');

  registerSignalRuntime();

  const { Trigger } = await import('@dxos/async');
  const { defs, SaveConfig } = await import('@dxos/config');
  const { createClientServices } = await import('@dxos/react-client');
  const { __COMPOSER_MIGRATIONS__ } = await import('@braneframe/types/migrations');
  const { Migrations } = await import('@dxos/migrations');

  Migrations.define(appKey, __COMPOSER_MIGRATIONS__);

  // Namespace for global Composer test & debug hooks.
  (window as any).composer = {};

  let config = await setupConfig();
  if (
    !config.values.runtime?.client?.storage?.dataStore &&
    (await defaultStorageIsEmpty(config.values.runtime?.client?.storage))
  ) {
    // NOTE: Set default for first time users to IDB (works better with automerge CRDTs).
    // Needs to be done before worker is created.
    await SaveConfig({
      runtime: { client: { storage: { dataStore: defs.Runtime.Client.Storage.StorageDriver.IDB } } },
    });
    config = await setupConfig();
  }

  // Intentionally do not await, don't block app startup for telemetry.
  // namespace has to match the value passed to sentryVitePlugin in vite.config.ts for sourcemaps to work.
  const observability = initializeAppObservability({ namespace: appKey, config });

  // TODO(nf): refactor.
  const observabilityDisabled = await isObservabilityDisabled(appKey);
  const observabilityGroup = await getObservabilityGroup(appKey);

  const services = await createClientServices(
    config,
    config.values.runtime?.app?.env?.DX_HOST
      ? undefined
      : () =>
          new SharedWorker(new URL('./shared-worker', import.meta.url), {
            type: 'module',
            name: 'dxos-client-worker',
          }),
    observabilityGroup,
    !observabilityDisabled,
  );

  const firstRun = new Trigger();
  const isSocket = !!(globalThis as any).__args;
  const isPwa = config.values.runtime?.app?.env?.DX_PWA !== 'false';
  const isDeck = localStorage.getItem('dxos.org/settings/layout/disable-deck') !== 'true';
  const isDev = !['production', 'staging'].includes(config.values.runtime?.app?.env?.DX_ENVIRONMENT);
  const isExperimental = config.values.runtime?.app?.env?.DX_EXPERIMENTAL === 'true';

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
        <div className='flex flex-col justify-end bs-[100dvh]'>
          <Status indeterminate aria-label='Initializing' classNames='w-full' />
        </div>
      </ThemeProvider>
    ),
    order: [
      // Needs to run ASAP on startup (but not blocking).
      ObservabilityMeta,
      ThemeMeta,
      // TODO(wittjosiah): Consider what happens to PWA updates when hitting error boundary.
      ...(!isSocket && isPwa ? [PwaMeta] : []),
      ...(isSocket ? [NativeMeta] : []),
      WelcomeMeta,

      // UX
      AttentionMeta,
      isDeck ? DeckMeta : LayoutMeta,
      NavTreeMeta,
      SettingsMeta,
      StatusBarMeta,

      // Shell and help (client must precede help because help’s context depends on client’s)
      ClientMeta,
      HelpMeta,

      // Data integrations
      SpaceMeta,
      DebugMeta,
      FilesMeta,
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
      MapMeta,
      MarkdownMeta,
      MermaidMeta,
      PresenterMeta,
      SketchMeta,
      StackMeta,
      TableMeta,
      ThreadMeta,
      WildcardMeta,

      // TODO(burdon): Currently last so that the search action is added at end of dropdown menu.
      SearchMeta,

      ...(isExperimental ? [GithubMeta, GridMeta, KanbanMeta, OutlinerMeta, ScriptMeta] : []),
    ],
    plugins: {
      [AttentionMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-attention')),
      [ChainMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-chain')),
      [ChessMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-chess')),
      [ClientMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-client'), {
        appKey,
        config,
        services,
        shell: './shell.html',
        onClientInitialized: async (client) => {
          const { LegacyTypes } = await import('@braneframe/types/migrations');
          client.addTypes([
            LegacyTypes.DocumentType,
            LegacyTypes.FileType,
            LegacyTypes.FolderType,
            LegacyTypes.MessageType,
            LegacyTypes.SectionType,
            LegacyTypes.StackType,
            LegacyTypes.TableType,
            LegacyTypes.TextType,
            LegacyTypes.ThreadType,
          ]);
        },
        onReady: async (client, plugins) => {
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!dispatch) {
            return;
          }

          const searchParams = new URLSearchParams(location.search);
          const spaceInvitationCode = searchParams.get('spaceInvitationCode') ?? undefined;
          const deviceInvitationCode = searchParams.get('deviceInvitationCode') ?? undefined;
          if (deviceInvitationCode) {
            await dispatch({
              plugin: CLIENT_PLUGIN,
              action: ClientAction.JOIN_IDENTITY,
              data: { invitationCode: deviceInvitationCode },
            });

            removeQueryParamByValue(deviceInvitationCode);
          } else if (spaceInvitationCode && client.halo.identity.get()) {
            await dispatch([
              {
                plugin: SPACE_PLUGIN,
                action: SpaceAction.JOIN,
                data: { invitationCode: spaceInvitationCode },
              },
              {
                action: NavigationAction.OPEN,
              },
            ]);

            removeQueryParamByValue(spaceInvitationCode);
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
        firstRun,
        onFirstRun: async ({ client, dispatch }) => {
          const { create } = await import('@dxos/echo-schema');
          const { DocumentType, TextType, CollectionType } = await import('@braneframe/types');
          const personalSpaceCollection = client.spaces.default.properties[CollectionType.typename] as CollectionType;
          const content = create(TextType, { content: INITIAL_CONTENT });
          const document = create(DocumentType, { name: INITIAL_TITLE, content, threads: [] });
          personalSpaceCollection?.objects.push(document);
          void dispatch({
            action: NavigationAction.OPEN,
            data: { activeParts: { main: [client.spaces.default.id] } },
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
      [WelcomeMeta.id]: Plugin.lazy(() => import('./plugins/welcome'), { firstRun }),
      [WildcardMeta.id]: Plugin.lazy(() => import('@braneframe/plugin-wildcard')),
    },
    core: [
      ...(isSocket ? [NativeMeta.id] : []),
      ...(!isSocket && isPwa ? [PwaMeta.id] : []),
      AttentionMeta.id,
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
      WelcomeMeta.id,
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
    const { createStorageObjects } = await import('@dxos/client-services');
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
