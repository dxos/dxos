//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { OperationPlugin, type Plugin, RuntimePlugin } from '@dxos/app-framework';
import { APP_DOMAIN } from '@dxos/app-toolkit';
import { type ClientServicesProvider, type Config } from '@dxos/client';
import { type LogBuffer } from '@dxos/log';
import { type Observability } from '@dxos/observability';
import { AssistantPlugin } from '@dxos/plugin-assistant';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { AutomationPlugin } from '@dxos/plugin-automation';
import { BoardPlugin } from '@dxos/plugin-board';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ClientPlugin } from '@dxos/plugin-client';
import { ConductorPlugin } from '@dxos/plugin-conductor';
import { DailySummaryPlugin } from '@dxos/plugin-daily-summary';
import { DebugPlugin } from '@dxos/plugin-debug';
import { DeckPlugin } from '@dxos/plugin-deck';
import { ExcalidrawPlugin } from '@dxos/plugin-excalidraw';
import { ExplorerPlugin } from '@dxos/plugin-explorer';
import { FeedPlugin } from '@dxos/plugin-feed';
import { GraphPlugin } from '@dxos/plugin-graph';
import { HelpPlugin } from '@dxos/plugin-help';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { KanbanPlugin } from '@dxos/plugin-kanban';
import { MapPlugin } from '@dxos/plugin-map';
import { MapPlugin as MapPluginSolid } from '@dxos/plugin-map-solid';
import { MarkdownPlugin } from '@dxos/plugin-markdown';
import { MasonryPlugin } from '@dxos/plugin-masonry';
import { MeetingPlugin } from '@dxos/plugin-meeting';
import { MermaidPlugin } from '@dxos/plugin-mermaid';
import { NativePlugin } from '@dxos/plugin-native';
import { NativeFilesystemPlugin } from '@dxos/plugin-native-filesystem';
import { NavTreePlugin } from '@dxos/plugin-navtree';
import { ObservabilityPlugin } from '@dxos/plugin-observability';
import { OutlinerPlugin } from '@dxos/plugin-outliner';
import { PipelinePlugin } from '@dxos/plugin-pipeline';
import { PresenterPlugin } from '@dxos/plugin-presenter';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { PwaPlugin } from '@dxos/plugin-pwa';
import { RegistryPlugin } from '@dxos/plugin-registry';
import { ScriptPlugin } from '@dxos/plugin-script';
import { SearchPlugin } from '@dxos/plugin-search';
import { SettingsPlugin } from '@dxos/plugin-settings';
import { SheetPlugin } from '@dxos/plugin-sheet';
import { SimpleLayoutPlugin } from '@dxos/plugin-simple-layout';
import { SketchPlugin } from '@dxos/plugin-sketch';
import { SpacePlugin } from '@dxos/plugin-space';
import { SpacetimePlugin } from '@dxos/plugin-spacetime';
import { SpecPlugin } from '@dxos/plugin-spec';
import { SpotlightPlugin } from '@dxos/plugin-spotlight';
import { StackPlugin } from '@dxos/plugin-stack';
import { StatusBarPlugin } from '@dxos/plugin-status-bar';
import { TablePlugin } from '@dxos/plugin-table';
import { ThemePlugin } from '@dxos/plugin-theme';
import { ThreadPlugin } from '@dxos/plugin-thread';
import { TokenManagerPlugin } from '@dxos/plugin-token-manager';
import { TranscriptionPlugin } from '@dxos/plugin-transcription';
import { VoxelPlugin } from '@dxos/plugin-voxel';
import { WnfsPlugin } from '@dxos/plugin-wnfs';
import { YouTubePlugin } from '@dxos/plugin-youtube';
import { ZenPlugin } from '@dxos/plugin-zen';
import { isTruthy } from '@dxos/util';

import { steps } from './help';
import { WelcomePlugin } from './plugins';

const APP_LINK_ORIGIN = new URL('https://' + APP_DOMAIN).origin;

export type State = {
  appKey: string;
  config: Config;
  services: ClientServicesProvider;
  observability: Promise<Observability.Observability>;
  logBuffer: LogBuffer;
};

export type PluginConfig = State & {
  isDev?: boolean;
  isPwa?: boolean;
  isTauri?: boolean;
  isLabs?: boolean;
  isStrict?: boolean;
  isPopover?: boolean;
  isMobile?: boolean;
};

export const getCore = ({ isPwa, isTauri, isPopover, isMobile }: PluginConfig): string[] => {
  const layoutPluginId = isPopover
    ? SpotlightPlugin.meta.id
    : isMobile
      ? SimpleLayoutPlugin.meta.id
      : DeckPlugin.meta.id;
  return [
    AttentionPlugin.meta.id,
    AutomationPlugin.meta.id,
    ClientPlugin.meta.id,
    GraphPlugin.meta.id,
    HelpPlugin.meta.id,
    layoutPluginId,
    isTauri && !isMobile && !isPopover && NativePlugin.meta.id,
    OperationPlugin.meta.id,
    NavTreePlugin.meta.id,
    ObservabilityPlugin.meta.id,
    PreviewPlugin.meta.id,
    !isTauri && isPwa && PwaPlugin.meta.id,
    RegistryPlugin.meta.id,
    RuntimePlugin.meta.id,
    SearchPlugin.meta.id,
    SettingsPlugin.meta.id,
    SpacePlugin.meta.id,
    StatusBarPlugin.meta.id,
    ThemePlugin.meta.id,
    TokenManagerPlugin.meta.id,
    WelcomePlugin.meta.id,
  ]
    .filter(isTruthy)
    .flat();
};

export const getDefaults = ({ isDev, isLabs }: PluginConfig): string[] =>
  [
    // Default
    InboxPlugin.meta.id,
    KanbanPlugin.meta.id,
    MarkdownPlugin.meta.id,
    MasonryPlugin.meta.id,
    SheetPlugin.meta.id,
    SketchPlugin.meta.id,
    TablePlugin.meta.id,
    ThreadPlugin.meta.id,
    WnfsPlugin.meta.id,

    SpecPlugin.meta.id,

    // Dev
    isDev && DebugPlugin.meta.id,

    // Labs
    (isDev || isLabs) && [
      AssistantPlugin.meta.id,
      DailySummaryPlugin.meta.id,
      FeedPlugin.meta.id,
      MeetingPlugin.meta.id,
      OutlinerPlugin.meta.id,
      PipelinePlugin.meta.id,
      TranscriptionPlugin.meta.id,
      ZenPlugin.meta.id,
    ],
  ]
    .filter(isTruthy)
    .flat();

export const getPlugins = ({
  appKey,
  config,
  services,
  observability,
  logBuffer,
  isDev,
  isLabs,
  isPwa,
  isTauri,
  isPopover,
  isMobile,
}: PluginConfig): Plugin.Plugin[] => {
  const layoutPlugin = isPopover ? SpotlightPlugin() : isMobile ? SimpleLayoutPlugin({}) : DeckPlugin();
  const origin = isTauri ? APP_LINK_ORIGIN : window.location.origin;
  return [
    AssistantPlugin(),
    AttentionPlugin(),
    AutomationPlugin(),
    BoardPlugin(),
    ChessPlugin(),
    ClientPlugin({
      config,
      services,
      shareableLinkOrigin: origin,
      onReset: ({ target }) =>
        Effect.sync(() => {
          localStorage.clear();
          if (target === 'deviceInvitation') {
            window.location.assign(new URL('/?deviceInvitationCode=', window.location.origin));
          } else if (target === 'recoverIdentity') {
            window.location.assign(new URL('/?recoverIdentity=true', window.location.origin));
          } else {
            window.location.pathname = '/';
          }
        }),
    }),
    ConductorPlugin(),
    DailySummaryPlugin(),
    DebugPlugin({ logBuffer }),
    isLabs && ExcalidrawPlugin(),
    ExplorerPlugin(),
    FeedPlugin(),
    GraphPlugin(),
    HelpPlugin({ steps }),
    InboxPlugin(),
    OperationPlugin(),
    KanbanPlugin(),
    layoutPlugin,
    MapPlugin(),
    isLabs && MapPluginSolid(),
    MarkdownPlugin(),
    MasonryPlugin(),
    MeetingPlugin(),
    MermaidPlugin(),
    isTauri && !isMobile && !isPopover && NativePlugin(),
    NativeFilesystemPlugin(),
    NavTreePlugin(),
    ObservabilityPlugin({
      namespace: appKey,
      observability: () => observability,
    }),
    OutlinerPlugin(),
    PipelinePlugin(),
    PresenterPlugin(),
    PreviewPlugin(),
    !isTauri && isPwa && PwaPlugin(),
    RegistryPlugin(),
    RuntimePlugin(),
    ScriptPlugin(),
    SearchPlugin(),
    SettingsPlugin(),
    SheetPlugin(),
    SketchPlugin(),
    SpacetimePlugin(),
    SpacePlugin({
      observability: true,
      shareableLinkOrigin: origin,
    }),
    SpecPlugin(),
    StackPlugin(),
    StatusBarPlugin(),
    TablePlugin(),
    ThemePlugin({
      appName: 'Composer',
      noCache: isDev,
      platform: isMobile ? 'mobile' : 'desktop',
    }),
    ThreadPlugin(),
    TokenManagerPlugin(),
    TranscriptionPlugin(),
    VoxelPlugin(),
    WelcomePlugin(),
    WnfsPlugin(),
    YouTubePlugin(),
    ZenPlugin(),
  ]
    .filter(isTruthy)
    .flat();
};
