//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { createApp, NavigationAction, parseIntentPlugin, Plugin, resolvePlugin } from '@dxos/app-framework';
import { type defs } from '@dxos/config';
import { registerSignalRuntime } from '@dxos/echo-signals';
import { log } from '@dxos/log';
import { getObservabilityGroup, initializeAppObservability, isObservabilityDisabled } from '@dxos/observability';
import AttentionMeta from '@dxos/plugin-attention/meta';
import ChainMeta from '@dxos/plugin-chain/meta';
import ChessMeta from '@dxos/plugin-chess/meta';
import ClientMeta, { CLIENT_PLUGIN, ClientAction } from '@dxos/plugin-client/meta';
import DebugMeta from '@dxos/plugin-debug/meta';
import DeckMeta from '@dxos/plugin-deck/meta';
import ExcalidrawMeta from '@dxos/plugin-excalidraw/meta';
import ExplorerMeta from '@dxos/plugin-explorer/meta';
import FilesMeta from '@dxos/plugin-files/meta';
import FunctionMeta from '@dxos/plugin-function/meta';
import GithubMeta from '@dxos/plugin-github/meta';
import GptMeta from '@dxos/plugin-gpt/meta';
import GraphMeta from '@dxos/plugin-graph/meta';
import GridMeta from '@dxos/plugin-grid/meta';
import HelpMeta from '@dxos/plugin-help/meta';
import InboxMeta from '@dxos/plugin-inbox/meta';
import IpfsMeta from '@dxos/plugin-ipfs/meta';
import KanbanMeta from '@dxos/plugin-kanban/meta';
import MapMeta from '@dxos/plugin-map/meta';
import MarkdownMeta from '@dxos/plugin-markdown/meta';
import MermaidMeta from '@dxos/plugin-mermaid/meta';
import MetadataMeta from '@dxos/plugin-metadata/meta';
import NativeMeta from '@dxos/plugin-native/meta';
import NavTreeMeta from '@dxos/plugin-navtree/meta';
import ObservabilityMeta from '@dxos/plugin-observability/meta';
import OutlinerMeta from '@dxos/plugin-outliner/meta';
import PresenterMeta from '@dxos/plugin-presenter/meta';
import PwaMeta from '@dxos/plugin-pwa/meta';
import RegistryMeta from '@dxos/plugin-registry/meta';
import ScriptMeta from '@dxos/plugin-script/meta';
import SearchMeta from '@dxos/plugin-search/meta';
import SettingsMeta from '@dxos/plugin-settings/meta';
import SheetMeta from '@dxos/plugin-sheet/meta';
import SketchMeta from '@dxos/plugin-sketch/meta';
import SpaceMeta, { SPACE_PLUGIN, SpaceAction } from '@dxos/plugin-space/meta';
import { type CollectionType } from '@dxos/plugin-space/types';
import StackMeta from '@dxos/plugin-stack/meta';
import StatusBarMeta from '@dxos/plugin-status-bar/meta';
import TableMeta from '@dxos/plugin-table/meta';
import ThemeMeta from '@dxos/plugin-theme/meta';
import ThreadMeta from '@dxos/plugin-thread/meta';
import WildcardMeta from '@dxos/plugin-wildcard/meta';
import { Status, ThemeProvider, Tooltip } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';
import { TRACE_PROCESSOR } from '@dxos/tracing';

import { ResetDialog } from './components';
import { setupConfig } from './config';
import { appKey, INITIAL_COLLECTION_TITLE, INITIAL_CONTENT, INITIAL_DOC_TITLE } from './constants';
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
  const { Migrations } = await import('@dxos/migrations');
  const { __COMPOSER_MIGRATIONS__ } = await import('./migrations');

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
      DeckMeta,
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

      // Framework extensions
      // TODO(wittjosiah): Space plugin currently needs to be before the Graph plugin.
      //  Root folder needs to be created before the graph is built or else it's not ordered first.
      GraphMeta,
      MetadataMeta,
      RegistryMeta,

      // Presentation
      ChessMeta,
      ExcalidrawMeta,
      ExplorerMeta,
      MapMeta,
      MarkdownMeta,
      MermaidMeta,
      PresenterMeta,
      ScriptMeta,
      SheetMeta,
      SketchMeta,
      StackMeta,
      TableMeta,
      ThreadMeta,
      WildcardMeta,

      // TODO(burdon): Currently last so that the search action is added at end of dropdown menu.
      SearchMeta,

      ...(isExperimental
        ? [ChainMeta, FunctionMeta, GithubMeta, GptMeta, GridMeta, InboxMeta, KanbanMeta, OutlinerMeta]
        : []),
    ],
    plugins: {
      [AttentionMeta.id]: Plugin.lazy(() => import('@dxos/plugin-attention')),
      [ChainMeta.id]: Plugin.lazy(() => import('@dxos/plugin-chain')),
      [ChessMeta.id]: Plugin.lazy(() => import('@dxos/plugin-chess')),
      [ClientMeta.id]: Plugin.lazy(() => import('@dxos/plugin-client'), {
        appKey,
        config,
        services,
        shell: './shell.html',
        onClientInitialized: async (client) => {
          const { LegacyTypes } = await import('./migrations');
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

          client.shell.onReset(() => {
            window.location.pathname = '/';
          });
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
      [DebugMeta.id]: Plugin.lazy(() => import('@dxos/plugin-debug')),
      [ExcalidrawMeta.id]: Plugin.lazy(() => import('@dxos/plugin-excalidraw')),
      [ExplorerMeta.id]: Plugin.lazy(() => import('@dxos/plugin-explorer')),
      [FilesMeta.id]: Plugin.lazy(() => import('@dxos/plugin-files')),
      [FunctionMeta.id]: Plugin.lazy(() => import('@dxos/plugin-function')),
      [GithubMeta.id]: Plugin.lazy(() => import('@dxos/plugin-github')),
      [GptMeta.id]: Plugin.lazy(() => import('@dxos/plugin-gpt')),
      [GraphMeta.id]: Plugin.lazy(() => import('@dxos/plugin-graph')),
      [GridMeta.id]: Plugin.lazy(() => import('@dxos/plugin-grid')),
      [HelpMeta.id]: Plugin.lazy(() => import('@dxos/plugin-help'), { steps }),
      [InboxMeta.id]: Plugin.lazy(() => import('@dxos/plugin-inbox')),
      [IpfsMeta.id]: Plugin.lazy(() => import('@dxos/plugin-ipfs')),
      [KanbanMeta.id]: Plugin.lazy(() => import('@dxos/plugin-kanban')),
      [DeckMeta.id]: Plugin.lazy(() => import('@dxos/plugin-deck'), { observability: true }),
      [MapMeta.id]: Plugin.lazy(() => import('@dxos/plugin-map')),
      [MarkdownMeta.id]: Plugin.lazy(() => import('@dxos/plugin-markdown')),
      [MermaidMeta.id]: Plugin.lazy(() => import('@dxos/plugin-mermaid')),
      [MetadataMeta.id]: Plugin.lazy(() => import('@dxos/plugin-metadata')),
      ...(isSocket ? { [NativeMeta.id]: Plugin.lazy(() => import('@dxos/plugin-native')) } : {}),
      [NavTreeMeta.id]: Plugin.lazy(() => import('@dxos/plugin-navtree')),
      [ObservabilityMeta.id]: Plugin.lazy(() => import('@dxos/plugin-observability'), {
        namespace: appKey,
        observability: () => observability,
      }),
      [OutlinerMeta.id]: Plugin.lazy(() => import('@dxos/plugin-outliner')),
      [PresenterMeta.id]: Plugin.lazy(() => import('@dxos/plugin-presenter')),
      ...(!isSocket && isPwa ? { [PwaMeta.id]: Plugin.lazy(() => import('@dxos/plugin-pwa')) } : {}),
      [RegistryMeta.id]: Plugin.lazy(() => import('@dxos/plugin-registry')),
      [ScriptMeta.id]: Plugin.lazy(() => import('@dxos/plugin-script'), {
        containerUrl: '/script-frame/index.html',
      }),
      [SearchMeta.id]: Plugin.lazy(() => import('@dxos/plugin-search')),
      [SettingsMeta.id]: Plugin.lazy(() => import('@dxos/plugin-settings')),
      [SheetMeta.id]: Plugin.lazy(() => import('@dxos/plugin-sheet')),
      [SketchMeta.id]: Plugin.lazy(() => import('@dxos/plugin-sketch')),
      [SpaceMeta.id]: Plugin.lazy(() => import('@dxos/plugin-space'), {
        firstRun,
        onFirstRun: async ({ client, dispatch }) => {
          const { create } = await import('@dxos/echo-schema');
          const { fullyQualifiedId } = await import('@dxos/react-client/echo');
          const { DocumentType, TextType } = await import('@dxos/plugin-markdown/types');
          const { CollectionType } = await import('@dxos/plugin-space/types');

          const defaultSpaceCollection = client.spaces.default.properties[CollectionType.typename] as CollectionType;
          const readme = create(CollectionType, { name: INITIAL_COLLECTION_TITLE, objects: [], views: {} });
          defaultSpaceCollection?.objects.push(readme);

          INITIAL_CONTENT.forEach((content, index) => {
            content = content + '\n';
            const document = create(DocumentType, {
              name: index === 0 ? INITIAL_DOC_TITLE : undefined,
              content: create(TextType, { content }),
              threads: [],
            });
            readme.objects.push(document);
          });

          void dispatch({
            action: NavigationAction.OPEN,
            data: { activeParts: { main: [fullyQualifiedId(readme)] } },
          });
        },
      }),
      [StatusBarMeta.id]: Plugin.lazy(() => import('@dxos/plugin-status-bar')),
      [StackMeta.id]: Plugin.lazy(() => import('@dxos/plugin-stack')),
      [TableMeta.id]: Plugin.lazy(() => import('@dxos/plugin-table')),
      [ThemeMeta.id]: Plugin.lazy(() => import('@dxos/plugin-theme'), {
        appName: 'Composer',
      }),
      [ThreadMeta.id]: Plugin.lazy(() => import('@dxos/plugin-thread')),
      [WelcomeMeta.id]: Plugin.lazy(() => import('./plugins/welcome'), { firstRun }),
      [WildcardMeta.id]: Plugin.lazy(() => import('@dxos/plugin-wildcard')),
    },
    core: [
      ...(isSocket ? [NativeMeta.id] : []),
      ...(!isSocket && isPwa ? [PwaMeta.id] : []),
      AttentionMeta.id,
      ClientMeta.id,
      GraphMeta.id,
      FilesMeta.id,
      HelpMeta.id,
      DeckMeta.id,
      MetadataMeta.id,
      NavTreeMeta.id,
      ObservabilityMeta.id,
      RegistryMeta.id,
      SettingsMeta.id,
      SpaceMeta.id,
      StackMeta.id,
      StatusBarMeta.id,
      ThemeMeta.id,
      WelcomeMeta.id,
      WildcardMeta.id,
    ],
    defaults: [
      // prettier-ignore
      ...(isDev ? [DebugMeta.id] : []),
      MarkdownMeta.id,
      ThreadMeta.id,
      SketchMeta.id,
      TableMeta.id,
      SheetMeta.id,
      ChainMeta.id,
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
