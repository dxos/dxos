//
// Copyright 2024 DXOS.org
//

import { type HostPluginParams, LayoutAction, NavigationAction, Plugin, type PluginMeta } from '@dxos/app-framework';
import { type Trigger } from '@dxos/async';
import { type Config, type ClientServicesProvider } from '@dxos/client';
import { type Observability } from '@dxos/observability';
import AttentionMeta from '@dxos/plugin-attention/meta';
import AutomationMeta from '@dxos/plugin-automation/meta';
import ChessMeta from '@dxos/plugin-chess/meta';
import ClientMeta from '@dxos/plugin-client/meta';
import DebugMeta from '@dxos/plugin-debug/meta';
import DeckMeta from '@dxos/plugin-deck/meta';
import ExcalidrawMeta from '@dxos/plugin-excalidraw/meta';
import ExplorerMeta from '@dxos/plugin-explorer/meta';
import FilesMeta from '@dxos/plugin-files/meta';
import GithubMeta from '@dxos/plugin-github/meta';
import GraphMeta from '@dxos/plugin-graph/meta';
import GridMeta from '@dxos/plugin-grid/meta';
import HelpMeta from '@dxos/plugin-help/meta';
import InboxMeta from '@dxos/plugin-inbox/meta';
import IpfsMeta from '@dxos/plugin-ipfs/meta';
import KanbanMeta from '@dxos/plugin-kanban/meta';
import ManagerMeta from '@dxos/plugin-manager/meta';
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
import SheetMeta from '@dxos/plugin-sheet/meta';
import SketchMeta from '@dxos/plugin-sketch/meta';
import SpaceMeta from '@dxos/plugin-space/meta';
import { type CollectionType } from '@dxos/plugin-space/types';
import StackMeta from '@dxos/plugin-stack/meta';
import StatusBarMeta from '@dxos/plugin-status-bar/meta';
import TableMeta from '@dxos/plugin-table/meta';
import ThemeMeta from '@dxos/plugin-theme/meta';
import ThreadMeta from '@dxos/plugin-thread/meta';
import WildcardMeta from '@dxos/plugin-wildcard/meta';
import WnfsMeta from '@dxos/plugin-wnfs/meta';
import { isNotFalsy } from '@dxos/util';

import { INITIAL_CONTENT, INITIAL_DOC_TITLE } from './constants';
import { steps } from './help';
import { meta as WelcomeMeta } from './plugins/welcome/meta';

export type State = {
  appKey: string;
  firstRun: Trigger;
  config: Config;
  services: ClientServicesProvider;
  observability: Promise<Observability>;
};

export type PluginConfig = State & {
  isDev?: boolean;
  isPwa?: boolean;
  isSocket?: boolean;
  isLabs?: boolean;
  isStrict?: boolean;
};

/**
 * NOTE: Order is important.
 */
// TODO(burdon): Impl. plugin dependency graph (to determine order).
export const core = ({ isPwa, isSocket }: PluginConfig): PluginMeta[] =>
  [
    ObservabilityMeta,
    ThemeMeta,

    // TODO(wittjosiah): Consider what happens to PWA updates when hitting error boundary.
    !isSocket && isPwa && PwaMeta,
    isSocket && NativeMeta,
    WelcomeMeta,

    // Data integrations
    ClientMeta,
    SpaceMeta,
    FilesMeta,

    // Framework extensions
    // TODO(wittjosiah): Space plugin currently needs to be before the Graph plugin.
    //  Root folder needs to be created before the graph is built or else it's not ordered first.
    GraphMeta,
    MetadataMeta,

    // UX
    AttentionMeta,
    DeckMeta,
    HelpMeta,
    NavTreeMeta,
    ManagerMeta,
    RegistryMeta,
    StatusBarMeta,
    WildcardMeta,
  ].filter(isNotFalsy);

export const defaults = ({ isDev }: PluginConfig): PluginMeta[] =>
  [
    // prettier-ignore
    isDev && DebugMeta,
    MarkdownMeta,
    SketchMeta,
    SheetMeta,
    TableMeta,
    ThreadMeta,
  ].filter(isNotFalsy);

// TODO(burdon): Use meta tags to determine default/recommended/labs.
export const recommended = ({ isLabs }: PluginConfig): PluginMeta[] => [
  // prettier-ignore
  AutomationMeta,
  ChessMeta,
  ExcalidrawMeta,
  ExplorerMeta,
  IpfsMeta,
  MapMeta,
  MermaidMeta,
  PresenterMeta,
  ScriptMeta,
  SearchMeta,
  StackMeta,
  WnfsMeta,

  ...(isLabs
    ? [
        // prettier-ignore
        GithubMeta,
        GridMeta,
        InboxMeta,
        KanbanMeta,
        OutlinerMeta,
      ]
    : []),
];

/**
 * Individual plugin constructors.
 */
// TODO(burdon): Create registry of meta and constructors.
export const plugins = ({
  appKey,
  config,
  services,
  firstRun,
  observability,
  isPwa,
  isSocket,
}: PluginConfig): HostPluginParams['plugins'] => ({
  [AttentionMeta.id]: Plugin.lazy(() => import('@dxos/plugin-attention')),
  [AutomationMeta.id]: Plugin.lazy(() => import('@dxos/plugin-automation')),
  [ChessMeta.id]: Plugin.lazy(() => import('@dxos/plugin-chess')),
  [ClientMeta.id]: Plugin.lazy(() => import('@dxos/plugin-client'), {
    appKey,
    config,
    services,
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
    },
    onReset: async ({ target }) => {
      localStorage.clear();

      if (target === 'deviceInvitation') {
        window.location.assign(new URL('/?deviceInvitationCode=', window.location.origin));
      } else if (target === 'recoverIdentity') {
        window.location.assign(new URL('/?recoverIdentity=true', window.location.origin));
      } else {
        window.location.pathname = '/';
      }
    },
  }),
  [DebugMeta.id]: Plugin.lazy(() => import('@dxos/plugin-debug')),
  [ExcalidrawMeta.id]: Plugin.lazy(() => import('@dxos/plugin-excalidraw')),
  [ExplorerMeta.id]: Plugin.lazy(() => import('@dxos/plugin-explorer')),
  [FilesMeta.id]: Plugin.lazy(() => import('@dxos/plugin-files')),
  [GithubMeta.id]: Plugin.lazy(() => import('@dxos/plugin-github')),
  [GraphMeta.id]: Plugin.lazy(() => import('@dxos/plugin-graph')),
  [GridMeta.id]: Plugin.lazy(() => import('@dxos/plugin-grid')),
  [HelpMeta.id]: Plugin.lazy(() => import('@dxos/plugin-help'), { steps }),
  [InboxMeta.id]: Plugin.lazy(() => import('@dxos/plugin-inbox')),
  [IpfsMeta.id]: Plugin.lazy(() => import('@dxos/plugin-ipfs')),
  [KanbanMeta.id]: Plugin.lazy(() => import('@dxos/plugin-kanban')),
  [DeckMeta.id]: Plugin.lazy(() => import('@dxos/plugin-deck'), { observability: true }),
  [ManagerMeta.id]: Plugin.lazy(() => import('@dxos/plugin-manager')),
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
  [SheetMeta.id]: Plugin.lazy(() => import('@dxos/plugin-sheet')),
  [SketchMeta.id]: Plugin.lazy(() => import('@dxos/plugin-sketch')),
  [SpaceMeta.id]: Plugin.lazy(() => import('@dxos/plugin-space'), {
    firstRun,
    onFirstRun: async ({ client, dispatch }) => {
      const { create } = await import('@dxos/echo-schema');
      const { fullyQualifiedId } = await import('@dxos/react-client/echo');
      const { DocumentType, TextType } = await import('@dxos/plugin-markdown/types');
      const { CollectionType } = await import('@dxos/plugin-space/types');

      const readme = create(DocumentType, {
        name: INITIAL_DOC_TITLE,
        content: create(TextType, { content: INITIAL_CONTENT.join('\n\n') }),
        threads: [],
      });

      const defaultSpaceCollection = client.spaces.default.properties[CollectionType.typename] as CollectionType;
      defaultSpaceCollection?.objects.push(readme);

      await dispatch([
        {
          action: LayoutAction.SET_LAYOUT_MODE,
          data: { layoutMode: 'solo' },
        },
        {
          action: NavigationAction.OPEN,
          data: { activeParts: { main: [fullyQualifiedId(readme)] } },
        },
      ]);
      await dispatch({
        action: NavigationAction.EXPOSE,
        data: { id: fullyQualifiedId(readme) },
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
  [WnfsMeta.id]: Plugin.lazy(() => import('@dxos/plugin-wnfs')),
});
