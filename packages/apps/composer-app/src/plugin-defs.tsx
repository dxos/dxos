//
// Copyright 2024 DXOS.org
//

import type * as Plugin from '@dxos/app-framework/Plugin';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as BloggerPlugin from '@dxos/plugin-blogger/BloggerPlugin';
import * as BlueskyPlugin from '@dxos/plugin-bluesky/BlueskyPlugin';
import * as BoardPlugin from '@dxos/plugin-board/BoardPlugin';
import * as BookmarksPlugin from '@dxos/plugin-bookmarks/BookmarksPlugin';
import * as BrainPlugin from '@dxos/plugin-brain/BrainPlugin';
import * as CallsPlugin from '@dxos/plugin-calls/CallsPlugin';
import * as ChessComPlugin from '@dxos/plugin-chess-com/ChessComPlugin';
import * as ChessPlugin from '@dxos/plugin-chess/ChessPlugin';
import * as ClaudePlugin from '@dxos/plugin-claude/ClaudePlugin';
import * as CodePlugin from '@dxos/plugin-code/CodePlugin';
import * as CommercePlugin from '@dxos/plugin-commerce/CommercePlugin';
import * as ComputerPlugin from '@dxos/plugin-computer/ComputerPlugin';
import * as ConductorPlugin from '@dxos/plugin-conductor/ConductorPlugin';
import * as CrmPlugin from '@dxos/plugin-crm/CrmPlugin';
import * as CrxPlugin from '@dxos/plugin-crx/CrxPlugin';
import * as DebugPlugin from '@dxos/plugin-debug/DebugPlugin';
import * as DeepSeekPlugin from '@dxos/plugin-deepseek/DeepSeekPlugin';
import * as DevtoolsPlugin from '@dxos/plugin-devtools/DevtoolsPlugin';
import * as DiscordPlugin from '@dxos/plugin-discord/DiscordPlugin';
import * as DoctorPlugin from '@dxos/plugin-doctor/DoctorPlugin';
import * as DuffelPlugin from '@dxos/plugin-duffel/DuffelPlugin';
import * as ExcalidrawPlugin from '@dxos/plugin-excalidraw/ExcalidrawPlugin';
import * as ExplorerPlugin from '@dxos/plugin-explorer/ExplorerPlugin';
import * as FileSystemPlugin from '@dxos/plugin-file-system/FileSystemPlugin';
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
import * as LaMetricPlugin from '@dxos/plugin-lametric/LaMetricPlugin';
import * as LibraryPlugin from '@dxos/plugin-library/LibraryPlugin';
import * as LinearPlugin from '@dxos/plugin-linear/LinearPlugin';
import * as LingoPlugin from '@dxos/plugin-lingo/LingoPlugin';
import * as MagazinePlugin from '@dxos/plugin-magazine/MagazinePlugin';
import * as MapPluginSolid from '@dxos/plugin-map-solid/MapPlugin';
import * as MapPlugin from '@dxos/plugin-map/MapPlugin';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as MeetingPlugin from '@dxos/plugin-meeting/MeetingPlugin';
import * as MermaidPlugin from '@dxos/plugin-mermaid/MermaidPlugin';
import * as OsrmPlugin from '@dxos/plugin-osrm/OsrmPlugin';
import * as PaymentsPlugin from '@dxos/plugin-payments/PaymentsPlugin';
import * as PipelinePlugin from '@dxos/plugin-pipeline/PipelinePlugin';
import * as PresenterPlugin from '@dxos/plugin-presenter/PresenterPlugin';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as QaPlugin from '@dxos/plugin-qa/QaPlugin';
import * as ReviewPlugin from '@dxos/plugin-review/ReviewPlugin';
import * as S3Plugin from '@dxos/plugin-s3/S3Plugin';
import * as SamplePlugin from '@dxos/plugin-sample/SamplePlugin';
import * as SandboxPlugin from '@dxos/plugin-sandbox/SandboxPlugin';
import * as ScriptPlugin from '@dxos/plugin-script/ScriptPlugin';
import * as SequencerPlugin from '@dxos/plugin-sequencer/SequencerPlugin';
import * as SheetPlugin from '@dxos/plugin-sheet/SheetPlugin';
import * as SidekickPlugin from '@dxos/plugin-sidekick/SidekickPlugin';
import * as SlackPlugin from '@dxos/plugin-slack/SlackPlugin';
import * as SpacetimePlugin from '@dxos/plugin-spacetime/SpacetimePlugin';
import * as StackPlugin from '@dxos/plugin-stack/StackPlugin';
import * as StreamDeckPlugin from '@dxos/plugin-stream-deck/StreamDeckPlugin';
import * as StudioPlugin from '@dxos/plugin-studio/StudioPlugin';
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

import { type PluginConfig, getCorePlugins } from './plugin-defs.core.tsx';

export type { PluginConfig, State } from './plugin-defs.core.tsx';

/**
 * Plugin keys enabled by default for new users, per environment (dev/local).
 *
 * New keys go in the `isDev` block, and only for plugins that hit no permission-gated API on
 * activation: a `fetch` or `WebSocket` to localhost raises Chrome's local network prompt at boot.
 *
 * NOTE: Keep alphabetically sorted.
 */
export const getDefaults = ({ isDev, isLocal, isMobile }: PluginConfig): string[] =>
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
    // Connector-only, so defaulting it on adds no surface — it just puts DeepSeek in the
    // Connections service list for anyone who has a key.
    DeepSeekPlugin.meta.profile.key,

    // Local
    isLocal && SamplePlugin.meta.profile.key,

    // Transcription. On by default everywhere: the chat prompt picks the microphone up on its own —
    // it reads the plugin's capabilities optionally, so enabling it changes no other surface. Still
    // listed under labs below; the dedupe at the end collapses the two entries.
    TranscriptionPlugin.meta.profile.key,

    // Dev-only defaults (`isDev`: the `dev` environment or local `DX_DEV=true` — not preview, not a
    // plain `serve`). Sidekick is also gated on `isDev` for availability, not just defaults (below).
    isDev && [
      BloggerPlugin.meta.profile.key,
      BookmarksPlugin.meta.profile.key,
      CallsPlugin.meta.profile.key,
      CodePlugin.meta.profile.key,
      CommercePlugin.meta.profile.key,
      CrmPlugin.meta.profile.key,
      DebugPlugin.meta.profile.key,
      DevtoolsPlugin.meta.profile.key,
      DuffelPlugin.meta.profile.key,
      GamePlugin.meta.profile.key,
      HeyGenPlugin.meta.profile.key,
      IdeogramPlugin.meta.profile.key,
      IrohBeaconPlugin.meta.profile.key,
      LaMetricPlugin.meta.profile.key,
      LibraryPlugin.meta.profile.key,
      LingoPlugin.meta.profile.key,
      MagazinePlugin.meta.profile.key,
      MeetingPlugin.meta.profile.key,
      OsrmPlugin.meta.profile.key,
      PaymentsPlugin.meta.profile.key,
      PipelinePlugin.meta.profile.key,
      QaPlugin.meta.profile.key,
      S3Plugin.meta.profile.key,
      SandboxPlugin.meta.profile.key,
      SequencerPlugin.meta.profile.key,
      SidekickPlugin.meta.profile.key,
      StudioPlugin.meta.profile.key,
      TasksPlugin.meta.profile.key,
      TranscriptionPlugin.meta.profile.key,
      TypefullyPlugin.meta.profile.key,
      VideoPlugin.meta.profile.key,
      ZenPlugin.meta.profile.key,
    ],
  ]
    .filter(isTruthy)
    .flat()
    // Deduped: a mobile labs build lists transcription in both sets.
    .filter((key, index, keys) => keys.indexOf(key) === index);

/**
 * Full Composer plugin registry (preview and dev): shared core infrastructure plus every content
 * plugin. `plugin-defs.production.tsx` is the curated set `composer.space` ships.
 *
 * NOTE: Keep alphabetically sorted.
 */
export const getPlugins = (config: PluginConfig): Plugin.Plugin[] => {
  const { logStore, isDev, isLocal, isTauri, isPopover, isMobile } = config;
  return [
    ...getCorePlugins(config),
    AssistantPlugin.make(),
    BoardPlugin.make(),
    BookmarksPlugin.make(),
    BrainPlugin.make(),
    CallsPlugin.make(),
    ChessPlugin.make(),
    ChessComPlugin.make(),
    ClaudePlugin.make(),
    CodePlugin.make(),
    CommercePlugin.make(),
    // Dev-only coding harness, gated on `isDev` for availability (not just defaults, unlike
    // Debug/Devtools below) since its tools need the dev server's route (vite.config.ts).
    isDev && ComputerPlugin.make(),
    ConductorPlugin.make(),
    CrmPlugin.make(),
    !isTauri && CrxPlugin.make(),
    DebugPlugin.make({ logStore }),
    DeepSeekPlugin.make(),
    DevtoolsPlugin.make(),
    DiscordPlugin.make(),
    DoctorPlugin.make(),
    DuffelPlugin.make(),
    ExcalidrawPlugin.make(),
    ExplorerPlugin.make(),
    GamePlugin.make(),
    GooglePlugin.make(),
    HeyGenPlugin.make(),
    IbkrPlugin.make(),
    IdeogramPlugin.make(),
    IllustratorPlugin.make(),
    InboxPlugin.make(),
    JmapPlugin.make(),
    KanbanPlugin.make(),
    LaMetricPlugin.make(),
    LibraryPlugin.make(),
    MagazinePlugin.make(),
    MapPlugin.make(),
    isLocal && MapPluginSolid.make(),
    MarkdownPlugin.make(),
    MeetingPlugin.make(),
    MermaidPlugin.make(),
    // Desktop-only, and not core: the native file picker is a full-catalog capability, unlike
    // plugin-native's host integration.
    isTauri && !isMobile && !isPopover && FileSystemPlugin.make(),
    OsrmPlugin.make(),
    PaymentsPlugin.make(),
    PipelinePlugin.make(),
    PresenterPlugin.make(),
    QaPlugin.make(),
    ProjectsPlugin.make(),
    ReviewPlugin.make(),
    isLocal && SamplePlugin.make(),
    SandboxPlugin.make(),
    ScriptPlugin.make(),
    isDev && SidekickPlugin.make(),
    SheetPlugin.make(),
    StackPlugin.make(),
    StreamDeckPlugin.make(),
    StudioPlugin.make(),
    TablePlugin.make(),
    TasksPlugin.make(),
    ThreadPlugin.make(),
    TldrawPlugin.make(),
    TranscriptionPlugin.make(),
    ...experimental,
  ]
    .filter(isTruthy)
    .flat();
};

/**
 * Experimental plugins.
 *
 * NOTE: Keep alphabetically sorted.
 */
// TODO(wittjosiah): Consider factoring these out as standalone plugins published through the registry.
const experimental: Plugin.Plugin[] = [
  BloggerPlugin.make(),
  BlueskyPlugin.make(),
  FilePlugin.make(),
  FreeqPlugin.make(),
  GitHubPlugin.make(),
  IrohBeaconPlugin.make(),
  LinearPlugin.make(),
  LingoPlugin.make(),
  S3Plugin.make(),
  SequencerPlugin.make(),
  SlackPlugin.make(),
  SpacetimePlugin.make(),
  TerraPlugin.make(),
  TrelloPlugin.make(),
  TripPlugin.make(),
  TypefullyPlugin.make(),
  VideoPlugin.make(),
  VoxelPlugin.make(),
  WnfsPlugin.make(),
  ZenPlugin.make(),
];
