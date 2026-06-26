//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Plugin, ProcessManagerPlugin } from '@dxos/app-framework';
import { NativePasskey } from '@dxos/app-toolkit';
import { type ClientServicesProvider, type Config } from '@dxos/client';
import { type IdbLogStore } from '@dxos/log-store-idb';
import { type Observability } from '@dxos/observability';
import { AssistantPlugin } from '@dxos/plugin-assistant/plugin';
import { AttentionPlugin } from '@dxos/plugin-attention/plugin';
import { BlueskyPlugin } from '@dxos/plugin-bluesky/plugin';
import { BoardPlugin } from '@dxos/plugin-board/plugin';
import { BookmarksPlugin } from '@dxos/plugin-bookmarks/plugin';
import { CallsPlugin } from '@dxos/plugin-calls/plugin';
import { ChessPlugin } from '@dxos/plugin-chess/plugin';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { CodePlugin } from '@dxos/plugin-code/plugin';
import { CommentsPlugin } from '@dxos/plugin-comments/plugin';
import { CommercePlugin } from '@dxos/plugin-commerce/plugin';
import { ConductorPlugin } from '@dxos/plugin-conductor/plugin';
import { ConnectorPlugin } from '@dxos/plugin-connector/plugin';
import { CrmPlugin } from '@dxos/plugin-crm/plugin';
import { CrxPlugin } from '@dxos/plugin-crx/plugin';
import { DebugPlugin } from '@dxos/plugin-debug/plugin';
import { DeckPlugin } from '@dxos/plugin-deck/plugin';
import { DiscordPlugin } from '@dxos/plugin-discord/plugin';
import { DoctorPlugin } from '@dxos/plugin-doctor/plugin';
import { DuffelPlugin } from '@dxos/plugin-duffel/plugin';
import { ExplorerPlugin } from '@dxos/plugin-explorer/plugin';
import { FilePlugin } from '@dxos/plugin-file/plugin';
import { GalleryPlugin } from '@dxos/plugin-gallery/plugin';
import { GamePlugin } from '@dxos/plugin-game/plugin';
import { GeneratorPlugin } from '@dxos/plugin-generator/plugin';
import { GitHubPlugin } from '@dxos/plugin-github/plugin';
import { GraphPlugin } from '@dxos/plugin-graph/plugin';
import { InboxPlugin } from '@dxos/plugin-inbox/plugin';
import { IrohBeaconPlugin } from '@dxos/plugin-iroh-beacon/plugin';
import { KanbanPlugin } from '@dxos/plugin-kanban/plugin';
import { LinearPlugin } from '@dxos/plugin-linear/plugin';
import { MagazinePlugin } from '@dxos/plugin-magazine/plugin';
import { MapPlugin as MapPluginSolid } from '@dxos/plugin-map-solid/plugin';
import { MapPlugin } from '@dxos/plugin-map/plugin';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { MasonryPlugin } from '@dxos/plugin-masonry/plugin';
import { MeetingPlugin } from '@dxos/plugin-meeting/plugin';
import { MermaidPlugin } from '@dxos/plugin-mermaid/plugin';
import { NativeFilesystemPlugin } from '@dxos/plugin-native-filesystem/plugin';
import { NativePlugin } from '@dxos/plugin-native/plugin';
import { NavTreePlugin } from '@dxos/plugin-navtree/plugin';
import { ObservabilityPlugin } from '@dxos/plugin-observability/plugin';
import { OnboardingPlugin } from '@dxos/plugin-onboarding/plugin';
import { OsrmPlugin } from '@dxos/plugin-osrm/plugin';
import { OutlinerPlugin } from '@dxos/plugin-outliner/plugin';
import { PipelinePlugin } from '@dxos/plugin-pipeline/plugin';
import { PresenterPlugin } from '@dxos/plugin-presenter/plugin';
import { PreviewPlugin } from '@dxos/plugin-preview/plugin';
import { PwaPlugin } from '@dxos/plugin-pwa/plugin';
import { RegistryPlugin } from '@dxos/plugin-registry/plugin';
import { RoutinePlugin } from '@dxos/plugin-routine/plugin';
import { SamplePlugin } from '@dxos/plugin-sample/plugin';
import { SandboxPlugin } from '@dxos/plugin-sandbox/plugin';
import { ScriptPlugin } from '@dxos/plugin-script/plugin';
import { SearchPlugin } from '@dxos/plugin-search/plugin';
import { SequencerPlugin } from '@dxos/plugin-sequencer/plugin';
import { SettingsPlugin } from '@dxos/plugin-settings/plugin';
import { SheetPlugin } from '@dxos/plugin-sheet/plugin';
import { SidekickPlugin } from '@dxos/plugin-sidekick/plugin';
import { SimpleLayoutPlugin } from '@dxos/plugin-simple-layout/plugin';
import { SketchPlugin } from '@dxos/plugin-sketch/plugin';
import { SlackPlugin } from '@dxos/plugin-slack/plugin';
import { SpacePlugin } from '@dxos/plugin-space/plugin';
import { SpacetimePlugin } from '@dxos/plugin-spacetime/plugin';
import { SpotlightPlugin } from '@dxos/plugin-spotlight/plugin';
import { StackPlugin } from '@dxos/plugin-stack/plugin';
import { StatusBarPlugin } from '@dxos/plugin-status-bar/plugin';
import { SupportPlugin } from '@dxos/plugin-support/plugin';
import { TablePlugin } from '@dxos/plugin-table/plugin';
import { ThemePlugin } from '@dxos/plugin-theme/plugin';
import { ThreadPlugin } from '@dxos/plugin-thread/plugin';
import { TicTacToePlugin } from '@dxos/plugin-tictactoe/plugin';
import { TranscriptionPlugin } from '@dxos/plugin-transcription/plugin';
import { TrelloPlugin } from '@dxos/plugin-trello/plugin';
import { TripPlugin } from '@dxos/plugin-trip/plugin';
import { VideoPlugin } from '@dxos/plugin-video/plugin';
import { VoxelPlugin } from '@dxos/plugin-voxel/plugin';
import { WnfsPlugin } from '@dxos/plugin-wnfs/plugin';
import { ZenPlugin } from '@dxos/plugin-zen/plugin';
import { isTruthy } from '@dxos/util';

import { downloadLogs, steps } from './util';

const APP_LINK_ORIGIN = new URL('https://' + NativePasskey.APP_DOMAIN).origin;

export type State = {
  appKey: string;
  config: Config;
  services: ClientServicesProvider;
  observability: Promise<Observability.Observability>;
  logStore: IdbLogStore;
};

export type PluginConfig = State & {
  isDev?: boolean;
  isLocal?: boolean;
  isPwa?: boolean;
  isTauri?: boolean;
  isLabs?: boolean;
  isStrict?: boolean;
  isPopover?: boolean;
  isMobile?: boolean;
};

export const getDefaults = ({ isDev, isLocal, isLabs }: PluginConfig): string[] =>
  [
    // Default
    AssistantPlugin.meta.profile.key,
    CommentsPlugin.meta.profile.key,
    FilePlugin.meta.profile.key,
    InboxPlugin.meta.profile.key,
    KanbanPlugin.meta.profile.key,
    MarkdownPlugin.meta.profile.key,
    MasonryPlugin.meta.profile.key,
    SearchPlugin.meta.profile.key,
    SheetPlugin.meta.profile.key,
    SketchPlugin.meta.profile.key,
    TablePlugin.meta.profile.key,
    ThreadPlugin.meta.profile.key,

    // Dev
    isDev && DebugPlugin.meta.profile.key,

    // Local
    isLocal && SamplePlugin.meta.profile.key,

    // Labs
    (isDev || isLabs) && [
      BookmarksPlugin.meta.profile.key,
      CallsPlugin.meta.profile.key,
      MeetingPlugin.meta.profile.key,
      CodePlugin.meta.profile.key,
      DuffelPlugin.meta.profile.key,
      MagazinePlugin.meta.profile.key,
      GalleryPlugin.meta.profile.key,
      GamePlugin.meta.profile.key,
      IrohBeaconPlugin.meta.profile.key,
      OsrmPlugin.meta.profile.key,
      OutlinerPlugin.meta.profile.key,
      PipelinePlugin.meta.profile.key,
      CommercePlugin.meta.profile.key,
      CrmPlugin.meta.profile.key,
      SequencerPlugin.meta.profile.key,
      SandboxPlugin.meta.profile.key,
      SidekickPlugin.meta.profile.key,
      TranscriptionPlugin.meta.profile.key,
      VideoPlugin.meta.profile.key,
      ZenPlugin.meta.profile.key,
    ],
  ]
    .filter(isTruthy)
    .flat();

export const getPlugins = ({
  appKey,
  config,
  services,
  observability,
  logStore,
  isDev,
  isLocal,
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
    BoardPlugin(),
    BookmarksPlugin(),
    CallsPlugin(),
    ChessPlugin(),
    CommentsPlugin(),
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
    ConnectorPlugin(),
    !isTauri && CrxPlugin(),
    DebugPlugin({ logStore }),
    DiscordPlugin(),
    DoctorPlugin(),
    DuffelPlugin(),
    ExplorerPlugin(),
    MagazinePlugin(),
    GamePlugin(),
    GeneratorPlugin(),
    GraphPlugin(),
    InboxPlugin(),
    KanbanPlugin(),
    layoutPlugin,
    MapPlugin(),
    isLocal && MapPluginSolid(),
    MarkdownPlugin(),
    MasonryPlugin(),
    MeetingPlugin(),
    MermaidPlugin(),
    isTauri && !isMobile && !isPopover && NativePlugin(),
    isTauri && !isMobile && !isPopover && NativeFilesystemPlugin(),
    NavTreePlugin(),
    ObservabilityPlugin({
      namespace: appKey,
      observability: () => observability,
      downloadLogs: () => downloadLogs(logStore),
    }),
    OsrmPlugin(),
    OutlinerPlugin(),
    PipelinePlugin(),
    PresenterPlugin(),
    PreviewPlugin(),
    ProcessManagerPlugin(),
    CommercePlugin(),
    CrmPlugin(),
    !isTauri && isPwa && PwaPlugin(),
    RegistryPlugin(),
    RoutinePlugin(),
    isLocal && SamplePlugin(),
    SandboxPlugin(),
    ScriptPlugin(),
    SearchPlugin(),
    (isDev || isLabs) && SidekickPlugin(),
    SettingsPlugin(),
    SheetPlugin(),
    SketchPlugin(),
    SpacePlugin({
      observability: true,
      shareableLinkOrigin: origin,
    }),
    CodePlugin(),
    StackPlugin(),
    StatusBarPlugin(),
    SupportPlugin({ helpSteps: steps }),
    TablePlugin(),
    ThemePlugin({
      appName: 'Composer',
      noCache: isDev,
      platform: isMobile ? 'mobile' : 'desktop',
    }),
    ThreadPlugin(),
    TranscriptionPlugin(),
    OnboardingPlugin({ generateExemplarSpace: !isLocal }),

    // TODO(wittjosiah): Consider factoring these out as standalone plugins published through the registry.
    BlueskyPlugin(),
    GalleryPlugin(),
    GitHubPlugin(),
    IrohBeaconPlugin(),
    LinearPlugin(),
    SequencerPlugin(),
    SlackPlugin(),
    SpacetimePlugin(),
    TicTacToePlugin(),
    TrelloPlugin(),
    TripPlugin(),
    VideoPlugin(),
    VoxelPlugin(),
    FilePlugin(),
    WnfsPlugin(),
    ZenPlugin(),
  ]
    .filter(isTruthy)
    .flat();
};
