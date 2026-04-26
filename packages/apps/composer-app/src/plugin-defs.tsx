//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { OperationPlugin, type Plugin, RuntimePlugin } from '@dxos/app-framework';
import { APP_DOMAIN } from '@dxos/app-toolkit';
import { type ClientServicesProvider, type Config } from '@dxos/client';
import { type LogBuffer } from '@dxos/log';
import { type Observability } from '@dxos/observability';
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
  isLocal?: boolean;
  isPwa?: boolean;
  isTauri?: boolean;
  isLabs?: boolean;
  isStrict?: boolean;
  isPopover?: boolean;
  isMobile?: boolean;
};

/**
 * Plugin IDs (kept in sync with each plugin's `meta.id`).
 *
 * Phase 2 (lazy plugins): the actual plugin factories are dynamically imported in
 * {@link getPlugins} so the main bundle does not pull every plugin's transitive
 * graph at module-evaluation time. Hardcoding the ids here lets `getCore` and
 * `getDefaults` enumerate enabled plugins without paying that cost — they only
 * need the string ids.
 *
 * If a plugin renames its `meta.id`, this constant must be updated. There is no
 * guard for drift today; a future improvement is to expose `meta` from each
 * plugin via a `./meta` subpath export so we can import it without dragging the
 * whole plugin chunk along.
 */
const ID = {
  ASSISTANT: 'org.dxos.plugin.assistant',
  ATTENTION: 'org.dxos.plugin.attention',
  AUTOMATION: 'org.dxos.plugin.automation',
  BOARD: 'org.dxos.plugin.board',
  CHESS: 'org.dxos.plugin.chess',
  CLIENT: 'org.dxos.plugin.client',
  CONDUCTOR: 'org.dxos.plugin.conductor',
  CRX: 'org.dxos.plugin.crx',
  CRX_BRIDGE: 'org.dxos.plugin.crx-bridge',
  DAILY_SUMMARY: 'org.dxos.plugin.daily-summary',
  DEBUG: 'org.dxos.plugin.debug',
  DECK: 'org.dxos.plugin.deck',
  DISCORD: 'org.dxos.plugin.discord',
  EXPLORER: 'org.dxos.plugin.explorer',
  FEED: 'org.dxos.plugin.feed',
  GRAPH: 'org.dxos.plugin.graph',
  HELP: 'org.dxos.plugin.help',
  INBOX: 'org.dxos.plugin.inbox',
  IROH_BEACON: 'org.dxos.plugin.iroh-beacon',
  KANBAN: 'org.dxos.plugin.kanban',
  MAP: 'org.dxos.plugin.map',
  MAP_SOLID: 'org.dxos.plugin.map-solid',
  MARKDOWN: 'org.dxos.plugin.markdown',
  MASONRY: 'org.dxos.plugin.masonry',
  MEETING: 'org.dxos.plugin.meeting',
  MERMAID: 'org.dxos.plugin.mermaid',
  NATIVE: 'org.dxos.plugin.native',
  NATIVE_FILESYSTEM: 'org.dxos.plugin.native-filesystem',
  NAVTREE: 'org.dxos.plugin.navtree',
  OBSERVABILITY: 'org.dxos.plugin.observability',
  OUTLINER: 'org.dxos.plugin.outliner',
  PIPELINE: 'org.dxos.plugin.pipeline',
  PRESENTER: 'org.dxos.plugin.presenter',
  PREVIEW: 'org.dxos.plugin.preview',
  PWA: 'org.dxos.plugin.pwa',
  REGISTRY: 'org.dxos.plugin.registry',
  SAMPLE: 'org.dxos.plugin.sample',
  SCRIPT: 'org.dxos.plugin.script',
  SEARCH: 'org.dxos.plugin.search',
  SETTINGS: 'org.dxos.plugin.settings',
  SHEET: 'org.dxos.plugin.sheet',
  SIDEKICK: 'org.dxos.plugin.sidekick',
  SIMPLE_LAYOUT: 'org.dxos.plugin.simple-layout',
  SKETCH: 'org.dxos.plugin.sketch',
  SPACE: 'org.dxos.plugin.space',
  SPACETIME: 'org.dxos.plugin.spacetime',
  SPEC: 'org.dxos.plugin.spec',
  SPOTLIGHT: 'org.dxos.plugin.spotlight',
  STACK: 'org.dxos.plugin.stack',
  STATUS_BAR: 'org.dxos.plugin.status-bar',
  TABLE: 'org.dxos.plugin.table',
  THEME: 'org.dxos.plugin.theme',
  THREAD: 'org.dxos.plugin.thread',
  TICTACTOE: 'org.dxos.plugin.tictactoe',
  TOKEN_MANAGER: 'org.dxos.plugin.token-manager',
  TRANSCRIPTION: 'org.dxos.plugin.transcription',
  VOXEL: 'org.dxos.plugin.voxel',
  WNFS: 'org.dxos.plugin.wnfs',
  YOUTUBE: 'org.dxos.plugin.youtube',
  ZEN: 'org.dxos.plugin.zen',
} as const;

export const getCore = ({ isPwa, isTauri, isPopover, isMobile }: PluginConfig): string[] => {
  const layoutPluginId = isPopover ? ID.SPOTLIGHT : isMobile ? ID.SIMPLE_LAYOUT : ID.DECK;
  return [
    ID.ATTENTION,
    ID.AUTOMATION,
    ID.CLIENT,
    ID.CRX,
    ID.CRX_BRIDGE,
    ID.GRAPH,
    ID.HELP,
    layoutPluginId,
    isTauri && !isMobile && !isPopover && ID.NATIVE,
    OperationPlugin.meta.id,
    ID.NAVTREE,
    ID.OBSERVABILITY,
    ID.PREVIEW,
    !isTauri && isPwa && ID.PWA,
    ID.REGISTRY,
    RuntimePlugin.meta.id,
    ID.SEARCH,
    ID.SETTINGS,
    ID.SPACE,
    ID.STATUS_BAR,
    ID.THEME,
    ID.TOKEN_MANAGER,
    WelcomePlugin.meta.id,
  ]
    .filter(isTruthy)
    .flat();
};

export const getDefaults = ({ isDev, isLocal, isLabs }: PluginConfig): string[] =>
  [
    // Default
    ID.INBOX,
    ID.KANBAN,
    ID.MARKDOWN,
    ID.MASONRY,
    ID.SHEET,
    ID.SKETCH,
    ID.TABLE,
    ID.THREAD,
    ID.WNFS,

    ID.SPEC,

    // Dev
    isDev && ID.DEBUG,

    // Local
    isLocal && ID.SAMPLE,

    // Labs
    (isDev || isLabs) && [
      ID.ASSISTANT,
      ID.DAILY_SUMMARY,
      ID.DISCORD,
      ID.FEED,
      ID.IROH_BEACON,
      ID.MEETING,
      ID.OUTLINER,
      ID.PIPELINE,
      ID.SIDEKICK,
      ID.TRANSCRIPTION,
      ID.ZEN,
    ],
  ]
    .filter(isTruthy)
    .flat();

/**
 * Constructs every plugin instance the host can offer (whether enabled or not).
 *
 * Phase 2 (lazy plugins): instead of `import { FooPlugin } from '@dxos/plugin-foo'`
 * at the top of the file — which would force every plugin's transitive module
 * graph into the main bundle at parse time — each plugin is requested via a
 * dynamic `import()` here. Rollup emits a separate chunk per import; the network
 * and parser can pipeline all of them in parallel via {@link Promise.all}.
 *
 * The host (`main.tsx`) calls this once during the `plugins` profiler phase, so
 * the cost shifts from "module-graph evaluation before main() runs" (4.9 s of
 * blank screen on cold load) to a parallel fetch+parse during `plugins-init`
 * (where the boot loader is already on screen and animating).
 *
 * @returns A flat list of `Plugin.Plugin` instances, suitable for passing to
 *   `useApp({ plugins })`.
 */
export const getPlugins = async ({
  appKey,
  config,
  services,
  observability,
  logBuffer,
  isDev,
  isLocal,
  isLabs,
  isPwa,
  isTauri,
  isPopover,
  isMobile,
}: PluginConfig): Promise<Plugin.Plugin[]> => {
  const [
    { AssistantPlugin },
    { AttentionPlugin },
    { AutomationPlugin },
    { BoardPlugin },
    { ChessPlugin },
    { ClientPlugin },
    { ConductorPlugin },
    { CrxPlugin },
    { CrxBridgePlugin },
    { DailySummaryPlugin },
    { DebugPlugin },
    { DeckPlugin },
    { DiscordPlugin },
    { ExplorerPlugin },
    { FeedPlugin },
    { GraphPlugin },
    { HelpPlugin },
    { InboxPlugin },
    { IrohBeaconPlugin },
    { KanbanPlugin },
    { MapPlugin },
    mapSolidModule,
    { MarkdownPlugin },
    { MasonryPlugin },
    { MeetingPlugin },
    { MermaidPlugin },
    { NativePlugin },
    { NativeFilesystemPlugin },
    { NavTreePlugin },
    { ObservabilityPlugin },
    { OutlinerPlugin },
    { PipelinePlugin },
    { PresenterPlugin },
    { PreviewPlugin },
    { PwaPlugin },
    { RegistryPlugin },
    { SamplePlugin },
    { ScriptPlugin },
    { SearchPlugin },
    { SettingsPlugin },
    { SheetPlugin },
    { SidekickPlugin },
    { SimpleLayoutPlugin },
    { SketchPlugin },
    { SpacePlugin },
    { SpacetimePlugin },
    { SpecPlugin },
    { SpotlightPlugin },
    { StackPlugin },
    { StatusBarPlugin },
    { TablePlugin },
    { ThemePlugin },
    { ThreadPlugin },
    { TicTacToePlugin },
    { TokenManagerPlugin },
    { TranscriptionPlugin },
    { VoxelPlugin },
    { WnfsPlugin },
    { YouTubePlugin },
    { ZenPlugin },
  ] = await Promise.all([
    import('@dxos/plugin-assistant'),
    import('@dxos/plugin-attention'),
    import('@dxos/plugin-automation'),
    import('@dxos/plugin-board'),
    import('@dxos/plugin-chess'),
    import('@dxos/plugin-client'),
    import('@dxos/plugin-conductor'),
    import('@dxos/plugin-crx'),
    import('@dxos/plugin-crx-bridge'),
    import('@dxos/plugin-daily-summary'),
    import('@dxos/plugin-debug'),
    import('@dxos/plugin-deck'),
    import('@dxos/plugin-discord'),
    import('@dxos/plugin-explorer'),
    import('@dxos/plugin-feed'),
    import('@dxos/plugin-graph'),
    import('@dxos/plugin-help'),
    import('@dxos/plugin-inbox'),
    import('@dxos/plugin-iroh-beacon'),
    import('@dxos/plugin-kanban'),
    import('@dxos/plugin-map'),
    import('@dxos/plugin-map-solid'),
    import('@dxos/plugin-markdown'),
    import('@dxos/plugin-masonry'),
    import('@dxos/plugin-meeting'),
    import('@dxos/plugin-mermaid'),
    import('@dxos/plugin-native'),
    import('@dxos/plugin-native-filesystem'),
    import('@dxos/plugin-navtree'),
    import('@dxos/plugin-observability'),
    import('@dxos/plugin-outliner'),
    import('@dxos/plugin-pipeline'),
    import('@dxos/plugin-presenter'),
    import('@dxos/plugin-preview'),
    import('@dxos/plugin-pwa'),
    import('@dxos/plugin-registry'),
    import('@dxos/plugin-sample'),
    import('@dxos/plugin-script'),
    import('@dxos/plugin-search'),
    import('@dxos/plugin-settings'),
    import('@dxos/plugin-sheet'),
    import('@dxos/plugin-sidekick'),
    import('@dxos/plugin-simple-layout'),
    import('@dxos/plugin-sketch'),
    import('@dxos/plugin-space'),
    import('@dxos/plugin-spacetime'),
    import('@dxos/plugin-spec'),
    import('@dxos/plugin-spotlight'),
    import('@dxos/plugin-stack'),
    import('@dxos/plugin-status-bar'),
    import('@dxos/plugin-table'),
    import('@dxos/plugin-theme'),
    import('@dxos/plugin-thread'),
    import('@dxos/plugin-tictactoe'),
    import('@dxos/plugin-token-manager'),
    import('@dxos/plugin-transcription'),
    import('@dxos/plugin-voxel'),
    import('@dxos/plugin-wnfs'),
    import('@dxos/plugin-youtube'),
    import('@dxos/plugin-zen'),
  ]);

  // `@dxos/plugin-map-solid` re-exports `MapPlugin` (alias-imported below).
  const MapPluginSolid = mapSolidModule.MapPlugin;

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
    CrxPlugin(),
    CrxBridgePlugin(),
    DailySummaryPlugin(),
    DebugPlugin({ logBuffer }),
    DiscordPlugin(),
    ExplorerPlugin(),
    FeedPlugin(),
    GraphPlugin(),
    HelpPlugin({ steps }),
    InboxPlugin(),
    IrohBeaconPlugin(),
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
    isLocal && SamplePlugin(),
    ScriptPlugin(),
    SearchPlugin(),
    isLabs && SidekickPlugin(),
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
    TicTacToePlugin(),
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
