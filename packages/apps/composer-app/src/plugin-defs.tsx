//
// Copyright 2024 DXOS.org
//

import type * as Plugin from '@dxos/app-framework/Plugin';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as AtprotoPlugin from '@dxos/plugin-atproto/AtprotoPlugin';
import * as BloggerPlugin from '@dxos/plugin-blogger/BloggerPlugin';
import * as BlueskyPlugin from '@dxos/plugin-bluesky/BlueskyPlugin';
import * as BoardPlugin from '@dxos/plugin-board/BoardPlugin';
import * as BookmarksPlugin from '@dxos/plugin-bookmarks/BookmarksPlugin';
import * as BrainPlugin from '@dxos/plugin-brain/BrainPlugin';
import * as CallsPlugin from '@dxos/plugin-calls/CallsPlugin';
import * as ChessComPlugin from '@dxos/plugin-chess-com/ChessComPlugin';
import * as ChessPlugin from '@dxos/plugin-chess/ChessPlugin';
import * as CodePlugin from '@dxos/plugin-code/CodePlugin';
import * as CommercePlugin from '@dxos/plugin-commerce/CommercePlugin';
import * as ConductorPlugin from '@dxos/plugin-conductor/ConductorPlugin';
import * as CrmPlugin from '@dxos/plugin-crm/CrmPlugin';
import * as CrxPlugin from '@dxos/plugin-crx/CrxPlugin';
import * as DebugPlugin from '@dxos/plugin-debug/DebugPlugin';
import * as DevtoolsPlugin from '@dxos/plugin-devtools/DevtoolsPlugin';
import * as DiscordPlugin from '@dxos/plugin-discord/DiscordPlugin';
import * as DoctorPlugin from '@dxos/plugin-doctor/DoctorPlugin';
import * as DuffelPlugin from '@dxos/plugin-duffel/DuffelPlugin';
import * as ExcalidrawPlugin from '@dxos/plugin-excalidraw/ExcalidrawPlugin';
import * as ExplorerPlugin from '@dxos/plugin-explorer/ExplorerPlugin';
import * as FilePlugin from '@dxos/plugin-file/FilePlugin';
import * as FreeqPlugin from '@dxos/plugin-freeq/FreeqPlugin';
import * as GamePlugin from '@dxos/plugin-game/GamePlugin';
import * as GitHubPlugin from '@dxos/plugin-github/GitHubPlugin';
import * as GooglePlugin from '@dxos/plugin-google/GooglePlugin';
import * as HeyGenPlugin from '@dxos/plugin-heygen/HeyGenPlugin';
import * as IbkrPlugin from '@dxos/plugin-ibkr/IbkrPlugin';
import * as IdeogramPlugin from '@dxos/plugin-ideogram/IdeogramPlugin';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import * as InboxPlugin from '@dxos/plugin-inbox/InboxPlugin';
import * as IrohBeaconPlugin from '@dxos/plugin-iroh-beacon/IrohBeaconPlugin';
import * as JmapPlugin from '@dxos/plugin-jmap/JmapPlugin';
import * as KanbanPlugin from '@dxos/plugin-kanban/KanbanPlugin';
import * as LibraryPlugin from '@dxos/plugin-library/LibraryPlugin';
import * as LinearPlugin from '@dxos/plugin-linear/LinearPlugin';
import * as MagazinePlugin from '@dxos/plugin-magazine/MagazinePlugin';
import * as MapPluginSolid from '@dxos/plugin-map-solid/MapPlugin';
import * as MapPlugin from '@dxos/plugin-map/MapPlugin';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as MeetingPlugin from '@dxos/plugin-meeting/MeetingPlugin';
import * as MermaidPlugin from '@dxos/plugin-mermaid/MermaidPlugin';
import * as NativeFilesystemPlugin from '@dxos/plugin-native-filesystem/NativeFilesystemPlugin';
import * as NativePlugin from '@dxos/plugin-native/NativePlugin';
import * as OsrmPlugin from '@dxos/plugin-osrm/OsrmPlugin';
import * as PaymentsPlugin from '@dxos/plugin-payments/PaymentsPlugin';
import * as PipelinePlugin from '@dxos/plugin-pipeline/PipelinePlugin';
import * as PresenterPlugin from '@dxos/plugin-presenter/PresenterPlugin';
import * as PreviewPlugin from '@dxos/plugin-preview/PreviewPlugin';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as PwaPlugin from '@dxos/plugin-pwa/PwaPlugin';
import * as ReviewPlugin from '@dxos/plugin-review/ReviewPlugin';
import * as SamplePlugin from '@dxos/plugin-sample/SamplePlugin';
import * as SandboxPlugin from '@dxos/plugin-sandbox/SandboxPlugin';
import * as ScriptPlugin from '@dxos/plugin-script/ScriptPlugin';
import * as SearchPlugin from '@dxos/plugin-search/SearchPlugin';
import * as SequencerPlugin from '@dxos/plugin-sequencer/SequencerPlugin';
import * as SheetPlugin from '@dxos/plugin-sheet/SheetPlugin';
import * as SidekickPlugin from '@dxos/plugin-sidekick/SidekickPlugin';
import * as SlackPlugin from '@dxos/plugin-slack/SlackPlugin';
import * as SpacetimePlugin from '@dxos/plugin-spacetime/SpacetimePlugin';
import * as StackPlugin from '@dxos/plugin-stack/StackPlugin';
import * as StudioPlugin from '@dxos/plugin-studio/StudioPlugin';
import * as SupportPlugin from '@dxos/plugin-support/SupportPlugin';
import * as TablePlugin from '@dxos/plugin-table/TablePlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import * as TerraPlugin from '@dxos/plugin-terra/TerraPlugin';
import * as ThreadPlugin from '@dxos/plugin-thread/ThreadPlugin';
import * as TldrawPlugin from '@dxos/plugin-tldraw/TldrawPlugin';
import * as TranscriptionPlugin from '@dxos/plugin-transcription/TranscriptionPlugin';
import * as TrelloPlugin from '@dxos/plugin-trello/TrelloPlugin';
import * as TripPlugin from '@dxos/plugin-trip/TripPlugin';
import * as TypefullyPlugin from '@dxos/plugin-typefully/TypefullyPlugin';
import * as VideoPlugin from '@dxos/plugin-video/VideoPlugin';
import * as VoxelPlugin from '@dxos/plugin-voxel/VoxelPlugin';
import * as WnfsPlugin from '@dxos/plugin-wnfs/WnfsPlugin';
import * as ZenPlugin from '@dxos/plugin-zen/ZenPlugin';
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
    ReviewPlugin.meta.profile.key,
    FilePlugin.meta.profile.key,
    InboxPlugin.meta.profile.key,
    // Mail providers for the Inbox: a mailbox is inert without one, so they default on with it.
    GooglePlugin.meta.profile.key,
    JmapPlugin.meta.profile.key,
    KanbanPlugin.meta.profile.key,
    MarkdownPlugin.meta.profile.key,
    SheetPlugin.meta.profile.key,
    IllustratorPlugin.meta.profile.key,
    TldrawPlugin.meta.profile.key,
    ExcalidrawPlugin.meta.profile.key,
    TablePlugin.meta.profile.key,
    ThreadPlugin.meta.profile.key,

    // Dev
    isDev && [DebugPlugin.meta.profile.key, DevtoolsPlugin.meta.profile.key],

    // Local
    isLocal && SamplePlugin.meta.profile.key,

    // Labs. Enabled only under the labs flag — a local dev build should not start with a
    // different (larger) default set than production, which is what `isDev` here used to produce.
    // They stay in the registry either way, so enabling one is still a settings toggle away.
    isLabs && [
      BloggerPlugin.meta.profile.key,
      BookmarksPlugin.meta.profile.key,
      CallsPlugin.meta.profile.key,
      MeetingPlugin.meta.profile.key,
      CodePlugin.meta.profile.key,
      DuffelPlugin.meta.profile.key,
      LibraryPlugin.meta.profile.key,
      MagazinePlugin.meta.profile.key,
      GamePlugin.meta.profile.key,
      IdeogramPlugin.meta.profile.key,
      HeyGenPlugin.meta.profile.key,
      StudioPlugin.meta.profile.key,
      IrohBeaconPlugin.meta.profile.key,
      OsrmPlugin.meta.profile.key,
      TasksPlugin.meta.profile.key,
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
export const getPlugins = (config: PluginConfig): Plugin.Plugin[] => {
  const { logStore, isDev, isLocal, isLabs, isPwa, isTauri, isPopover, isMobile } = config;
  return [
    ...getCorePlugins(config),
    AssistantPlugin.make(),
    AtprotoPlugin.make(),
    BoardPlugin.make(),
    BookmarksPlugin.make(),
    BrainPlugin.make(),
    CallsPlugin.make(),
    ChessPlugin.make(),
    ChessComPlugin.make(),
    ReviewPlugin.make(),
    ConductorPlugin.make(),
    !isTauri && CrxPlugin.make(),
    DebugPlugin.make({ logStore }),
    DevtoolsPlugin.make(),
    DiscordPlugin.make(),
    DoctorPlugin.make(),
    DuffelPlugin.make(),
    IbkrPlugin.make(),
    IdeogramPlugin.make(),
    HeyGenPlugin.make(),
    StudioPlugin.make(),
    ExplorerPlugin.make(),
    MagazinePlugin.make(),
    GamePlugin.make(),
    GooglePlugin.make(),
    InboxPlugin.make(),
    JmapPlugin.make(),
    KanbanPlugin.make(),
    LibraryPlugin.make(),
    MapPlugin.make(),
    isLocal && MapPluginSolid.make(),
    MarkdownPlugin.make(),
    MeetingPlugin.make(),
    MermaidPlugin.make(),
    isTauri && !isMobile && !isPopover && NativePlugin.make(),
    isTauri && !isMobile && !isPopover && NativeFilesystemPlugin.make(),
    OsrmPlugin.make(),
    TasksPlugin.make(),
    PaymentsPlugin.make(),
    PipelinePlugin.make(),
    PresenterPlugin.make(),
    PreviewPlugin.make(),
    ProjectsPlugin.make(),
    CommercePlugin.make(),
    CrmPlugin.make(),
    !isTauri && isPwa && PwaPlugin.make(),
    isLocal && SamplePlugin.make(),
    SandboxPlugin.make(),
    ScriptPlugin.make(),
    SearchPlugin.make(),
    (isDev || isLabs) && SidekickPlugin.make(),
    SheetPlugin.make(),
    IllustratorPlugin.make(),
    TldrawPlugin.make(),
    ExcalidrawPlugin.make(),
    CodePlugin.make(),
    StackPlugin.make(),
    SupportPlugin.make({ helpSteps: steps }),
    TablePlugin.make(),
    TerraPlugin.make(),
    ThreadPlugin.make(),
    TranscriptionPlugin.make(),

    // TODO(wittjosiah): Consider factoring these out as standalone plugins published through the registry.
    BloggerPlugin.make(),
    BlueskyPlugin.make(),
    FreeqPlugin.make(),
    GitHubPlugin.make(),
    IrohBeaconPlugin.make(),
    LinearPlugin.make(),
    SequencerPlugin.make(),
    SlackPlugin.make(),
    SpacetimePlugin.make(),
    TrelloPlugin.make(),
    TripPlugin.make(),
    TypefullyPlugin.make(),
    VideoPlugin.make(),
    VoxelPlugin.make(),
    FilePlugin.make(),
    WnfsPlugin.make(),
    ZenPlugin.make(),
  ]
    .filter(isTruthy)
    .flat();
};
