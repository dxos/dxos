//
// Copyright 2024 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { AssistantPlugin } from '@dxos/plugin-assistant/plugin';
import { BloggerPlugin } from '@dxos/plugin-blogger/plugin';
import { BlueskyPlugin } from '@dxos/plugin-bluesky/plugin';
import { BoardPlugin } from '@dxos/plugin-board/plugin';
import { BookmarksPlugin } from '@dxos/plugin-bookmarks/plugin';
import { BrainPlugin } from '@dxos/plugin-brain/plugin';
import { CallsPlugin } from '@dxos/plugin-calls/plugin';
import { ChessComPlugin } from '@dxos/plugin-chess-com/plugin';
import { ChessPlugin } from '@dxos/plugin-chess/plugin';
import { CodePlugin } from '@dxos/plugin-code/plugin';
import { CommentsPlugin } from '@dxos/plugin-comments/plugin';
import { CommercePlugin } from '@dxos/plugin-commerce/plugin';
import { ConductorPlugin } from '@dxos/plugin-conductor/plugin';
import { ConnectorPlugin } from '@dxos/plugin-connector/plugin';
import { CrmPlugin } from '@dxos/plugin-crm/plugin';
import { CrxPlugin } from '@dxos/plugin-crx/plugin';
import { DebugPlugin } from '@dxos/plugin-debug/plugin';
import { DevtoolsPlugin } from '@dxos/plugin-devtools/plugin';
import { DiscordPlugin } from '@dxos/plugin-discord/plugin';
import { DoctorPlugin } from '@dxos/plugin-doctor/plugin';
import { DuffelPlugin } from '@dxos/plugin-duffel/plugin';
import { ExplorerPlugin } from '@dxos/plugin-explorer/plugin';
import { FilePlugin } from '@dxos/plugin-file/plugin';
import { FreeqPlugin } from '@dxos/plugin-freeq/plugin';
import { GamePlugin } from '@dxos/plugin-game/plugin';
import { GitHubPlugin } from '@dxos/plugin-github/plugin';
import { HeyGenPlugin } from '@dxos/plugin-heygen/plugin';
import { IbkrPlugin } from '@dxos/plugin-ibkr/plugin';
import { IdeogramPlugin } from '@dxos/plugin-ideogram/plugin';
import { InboxPlugin } from '@dxos/plugin-inbox/plugin';
import { IrohBeaconPlugin } from '@dxos/plugin-iroh-beacon/plugin';
import { KanbanPlugin } from '@dxos/plugin-kanban/plugin';
import { LinearPlugin } from '@dxos/plugin-linear/plugin';
import { MagazinePlugin } from '@dxos/plugin-magazine/plugin';
import { MapPlugin as MapPluginSolid } from '@dxos/plugin-map-solid/plugin';
import { MapPlugin } from '@dxos/plugin-map/plugin';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { MeetingPlugin } from '@dxos/plugin-meeting/plugin';
import { MermaidPlugin } from '@dxos/plugin-mermaid/plugin';
import { NativeFilesystemPlugin } from '@dxos/plugin-native-filesystem/plugin';
import { NativePlugin } from '@dxos/plugin-native/plugin';
import { OsrmPlugin } from '@dxos/plugin-osrm/plugin';
import { OutlinerPlugin } from '@dxos/plugin-outliner/plugin';
import { PaymentsPlugin } from '@dxos/plugin-payments/plugin';
import { PipelinePlugin } from '@dxos/plugin-pipeline/plugin';
import { PresenterPlugin } from '@dxos/plugin-presenter/plugin';
import { PreviewPlugin } from '@dxos/plugin-preview/plugin';
import { ProgressPlugin } from '@dxos/plugin-progress/plugin';
import { PwaPlugin } from '@dxos/plugin-pwa/plugin';
import { RoutinePlugin } from '@dxos/plugin-routine/plugin';
import { SamplePlugin } from '@dxos/plugin-sample/plugin';
import { SandboxPlugin } from '@dxos/plugin-sandbox/plugin';
import { ScriptPlugin } from '@dxos/plugin-script/plugin';
import { SearchPlugin } from '@dxos/plugin-search/plugin';
import { SequencerPlugin } from '@dxos/plugin-sequencer/plugin';
import { SheetPlugin } from '@dxos/plugin-sheet/plugin';
import { SidekickPlugin } from '@dxos/plugin-sidekick/plugin';
import { SketchPlugin } from '@dxos/plugin-sketch/plugin';
import { SlackPlugin } from '@dxos/plugin-slack/plugin';
import { SpacetimePlugin } from '@dxos/plugin-spacetime/plugin';
import { StackPlugin } from '@dxos/plugin-stack/plugin';
import { StudioPlugin } from '@dxos/plugin-studio/plugin';
import { SupportPlugin } from '@dxos/plugin-support/plugin';
import { TablePlugin } from '@dxos/plugin-table/plugin';
import { ThreadPlugin } from '@dxos/plugin-thread/plugin';
import { TicTacToePlugin } from '@dxos/plugin-tictactoe/plugin';
import { TranscriptionPlugin } from '@dxos/plugin-transcription/plugin';
import { TrelloPlugin } from '@dxos/plugin-trello/plugin';
import { TripPlugin } from '@dxos/plugin-trip/plugin';
import { TypefullyPlugin } from '@dxos/plugin-typefully/plugin';
import { VersioningPlugin } from '@dxos/plugin-versioning/plugin';
import { VideoPlugin } from '@dxos/plugin-video/plugin';
import { VoxelPlugin } from '@dxos/plugin-voxel/plugin';
import { WnfsPlugin } from '@dxos/plugin-wnfs/plugin';
import { ZenPlugin } from '@dxos/plugin-zen/plugin';
import { isTruthy } from '@dxos/util';

import { type PluginConfig, getCorePlugins } from './plugin-defs.core';
import { steps } from './util';

export type { PluginConfig, State } from './plugin-defs.core';

/**
 * Plugin keys enabled by default for new users, per environment (dev/local/labs).
 */
export const getDefaults = ({ isDev, isLocal, isLabs }: PluginConfig): string[] =>
  [
    // Default
    AssistantPlugin.meta.profile.key,
    CommentsPlugin.meta.profile.key,
    FilePlugin.meta.profile.key,
    InboxPlugin.meta.profile.key,
    KanbanPlugin.meta.profile.key,
    MarkdownPlugin.meta.profile.key,
    SearchPlugin.meta.profile.key,
    SheetPlugin.meta.profile.key,
    SketchPlugin.meta.profile.key,
    TablePlugin.meta.profile.key,
    ThreadPlugin.meta.profile.key,

    // Dev
    isDev && [DebugPlugin.meta.profile.key, DevtoolsPlugin.meta.profile.key],

    // Local
    isLocal && SamplePlugin.meta.profile.key,

    // Labs
    (isDev || isLabs) && [
      BloggerPlugin.meta.profile.key,
      BookmarksPlugin.meta.profile.key,
      CallsPlugin.meta.profile.key,
      MeetingPlugin.meta.profile.key,
      CodePlugin.meta.profile.key,
      DuffelPlugin.meta.profile.key,
      MagazinePlugin.meta.profile.key,
      GamePlugin.meta.profile.key,
      IdeogramPlugin.meta.profile.key,
      HeyGenPlugin.meta.profile.key,
      StudioPlugin.meta.profile.key,
      IrohBeaconPlugin.meta.profile.key,
      OsrmPlugin.meta.profile.key,
      OutlinerPlugin.meta.profile.key,
      PaymentsPlugin.meta.profile.key,
      PipelinePlugin.meta.profile.key,
      CommercePlugin.meta.profile.key,
      CrmPlugin.meta.profile.key,
      SequencerPlugin.meta.profile.key,
      SandboxPlugin.meta.profile.key,
      SidekickPlugin.meta.profile.key,
      TranscriptionPlugin.meta.profile.key,
      TypefullyPlugin.meta.profile.key,
      VideoPlugin.meta.profile.key,
      ZenPlugin.meta.profile.key,
    ],
  ]
    .filter(isTruthy)
    .flat();

/**
 * Full Composer plugin registry: shared core infrastructure plus every content plugin.
 */
export const getPlugins = (conf: PluginConfig): Plugin.Plugin[] => {
  const { logStore, isDev, isLocal, isLabs, isPwa, isTauri, isPopover, isMobile } = conf;
  return [
    ...getCorePlugins(conf),
    AssistantPlugin(),
    BoardPlugin(),
    BookmarksPlugin(),
    BrainPlugin(),
    CallsPlugin(),
    ChessPlugin(),
    ChessComPlugin(),
    CommentsPlugin(),
    ConductorPlugin(),
    ConnectorPlugin(),
    !isTauri && CrxPlugin(),
    DebugPlugin({ logStore }),
    DevtoolsPlugin(),
    DiscordPlugin(),
    DoctorPlugin(),
    DuffelPlugin(),
    IbkrPlugin(),
    IdeogramPlugin(),
    HeyGenPlugin(),
    StudioPlugin(),
    ExplorerPlugin(),
    MagazinePlugin(),
    GamePlugin(),
    InboxPlugin(),
    KanbanPlugin(),
    MapPlugin(),
    isLocal && MapPluginSolid(),
    MarkdownPlugin(),
    MeetingPlugin(),
    MermaidPlugin(),
    isTauri && !isMobile && !isPopover && NativePlugin(),
    isTauri && !isMobile && !isPopover && NativeFilesystemPlugin(),
    OsrmPlugin(),
    OutlinerPlugin(),
    PaymentsPlugin(),
    PipelinePlugin(),
    PresenterPlugin(),
    PreviewPlugin(),
    ProgressPlugin(),
    CommercePlugin(),
    CrmPlugin(),
    !isTauri && isPwa && PwaPlugin(),
    RoutinePlugin(),
    isLocal && SamplePlugin(),
    SandboxPlugin(),
    ScriptPlugin(),
    SearchPlugin(),
    (isDev || isLabs) && SidekickPlugin(),
    SheetPlugin(),
    SketchPlugin(),
    VersioningPlugin(),
    CodePlugin(),
    StackPlugin(),
    SupportPlugin({ helpSteps: steps }),
    TablePlugin(),
    ThreadPlugin(),
    TranscriptionPlugin(),

    // TODO(wittjosiah): Consider factoring these out as standalone plugins published through the registry.
    BloggerPlugin(),
    BlueskyPlugin(),
    FreeqPlugin(),
    GitHubPlugin(),
    IrohBeaconPlugin(),
    LinearPlugin(),
    SequencerPlugin(),
    SlackPlugin(),
    SpacetimePlugin(),
    TicTacToePlugin(),
    TrelloPlugin(),
    TripPlugin(),
    TypefullyPlugin(),
    VideoPlugin(),
    VoxelPlugin(),
    FilePlugin(),
    WnfsPlugin(),
    ZenPlugin(),
  ]
    .filter(isTruthy)
    .flat();
};
