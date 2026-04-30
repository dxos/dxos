//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { OperationPlugin, type Plugin, RuntimePlugin } from '@dxos/app-framework';
import { APP_DOMAIN } from '@dxos/app-toolkit';
import { type ClientServicesProvider, type Config } from '@dxos/client';
import { type IdbLogStore } from '@dxos/log-store-idb';
import { type Observability } from '@dxos/observability';
import { isTruthy } from '@dxos/util';

import { steps } from './help';
import { downloadLogs } from './log-download';
import { WelcomePlugin } from './plugins';

const APP_LINK_ORIGIN = new URL('https://' + APP_DOMAIN).origin;

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

/**
 * Plugin IDs (kept in sync with each plugin's `meta.id`).
 *
 * The plugin factories themselves are dynamically imported in {@link getPlugins}
 * so the main bundle does not pull every plugin's transitive graph at
 * module-evaluation time. Hardcoding the ids here lets `getCore` and
 * `getDefaults` enumerate enabled plugins without loading the full chunks.
 *
 * If a plugin renames its `meta.id`, this constant must be updated by hand —
 * there is no compile-time guard for drift. A future improvement is to expose
 * `meta` from each plugin via a `./meta` subpath export so we can import it
 * without dragging the whole plugin chunk along.
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
 * Optional progress callback fired as each plugin chunk's dynamic import
 * resolves. Hosts can use this to drive a visible counter on the boot
 * loader (`Loading plugins (3/55)…`) while the lazy chunks are pipelining.
 * Resolution order is *not* the array order — these are dynamic imports
 * resolving in parallel — so callers should treat `loaded` as a count, not
 * an index.
 */
export type GetPluginsOptions = {
  onPluginLoaded?: (loaded: number, total: number) => void;
};

/**
 * Constructs every plugin instance the host can offer (whether enabled or not).
 *
 * Each plugin is requested via a dynamic `import()` so the main bundle doesn't
 * pull every plugin's transitive module graph at parse time. Rollup emits a
 * separate chunk per import; network and parser pipeline them in parallel via
 * {@link Promise.all}. The boot loader is already on screen during this phase.
 *
 * @returns A flat list of `Plugin.Plugin` instances, suitable for passing to
 *   `useApp({ plugins })`.
 */
export const getPlugins = async (
  {
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
  }: PluginConfig,
  { onPluginLoaded }: GetPluginsOptions = {},
): Promise<Plugin.Plugin[]> => {
  // Track per-plugin completion. The boot loader's status bar shows a counter
  // ("Loading plugins (12/59)…") so the user has a visible signal that the
  // lazy chunks are landing in parallel rather than the long Promise.all
  // looking like a single frozen step. `track()` is generic so the tuple
  // typing of `Promise.all([...])` survives — `.map()` would collapse the
  // tuple into a homogeneous union and break the destructure below.
  let total = 0;
  let loaded = 0;
  const track = <T,>(promise: Promise<T>): Promise<T> => {
    // Bump synchronously during array construction so the final count is
    // available before any resolution callback fires.
    total += 1;
    return promise.then((module) => {
      loaded += 1;
      onPluginLoaded?.(loaded, total);
      return module;
    });
  };

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
    { ZenPlugin },
  ] = await Promise.all([
    track(import('@dxos/plugin-assistant')),
    track(import('@dxos/plugin-attention')),
    track(import('@dxos/plugin-automation')),
    track(import('@dxos/plugin-board')),
    track(import('@dxos/plugin-chess')),
    track(import('@dxos/plugin-client')),
    track(import('@dxos/plugin-conductor')),
    track(import('@dxos/plugin-crx')),
    track(import('@dxos/plugin-crx-bridge')),
    track(import('@dxos/plugin-daily-summary')),
    track(import('@dxos/plugin-debug')),
    track(import('@dxos/plugin-deck')),
    track(import('@dxos/plugin-discord')),
    track(import('@dxos/plugin-explorer')),
    track(import('@dxos/plugin-feed')),
    track(import('@dxos/plugin-graph')),
    track(import('@dxos/plugin-help')),
    track(import('@dxos/plugin-inbox')),
    track(import('@dxos/plugin-iroh-beacon')),
    track(import('@dxos/plugin-kanban')),
    track(import('@dxos/plugin-map')),
    track(import('@dxos/plugin-map-solid')),
    track(import('@dxos/plugin-markdown')),
    track(import('@dxos/plugin-masonry')),
    track(import('@dxos/plugin-meeting')),
    track(import('@dxos/plugin-mermaid')),
    track(import('@dxos/plugin-native')),
    track(import('@dxos/plugin-native-filesystem')),
    track(import('@dxos/plugin-navtree')),
    track(import('@dxos/plugin-observability')),
    track(import('@dxos/plugin-outliner')),
    track(import('@dxos/plugin-pipeline')),
    track(import('@dxos/plugin-presenter')),
    track(import('@dxos/plugin-preview')),
    track(import('@dxos/plugin-pwa')),
    track(import('@dxos/plugin-registry')),
    track(import('@dxos/plugin-sample')),
    track(import('@dxos/plugin-script')),
    track(import('@dxos/plugin-search')),
    track(import('@dxos/plugin-settings')),
    track(import('@dxos/plugin-sheet')),
    track(import('@dxos/plugin-sidekick')),
    track(import('@dxos/plugin-simple-layout')),
    track(import('@dxos/plugin-sketch')),
    track(import('@dxos/plugin-space')),
    track(import('@dxos/plugin-spacetime')),
    track(import('@dxos/plugin-spec')),
    track(import('@dxos/plugin-spotlight')),
    track(import('@dxos/plugin-stack')),
    track(import('@dxos/plugin-status-bar')),
    track(import('@dxos/plugin-table')),
    track(import('@dxos/plugin-theme')),
    track(import('@dxos/plugin-thread')),
    track(import('@dxos/plugin-tictactoe')),
    track(import('@dxos/plugin-token-manager')),
    track(import('@dxos/plugin-transcription')),
    track(import('@dxos/plugin-voxel')),
    track(import('@dxos/plugin-wnfs')),
    track(import('@dxos/plugin-zen')),
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
    DebugPlugin({ logStore }),
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
    isTauri && !isMobile && !isPopover && NativeFilesystemPlugin(),
    NavTreePlugin(),
    ObservabilityPlugin({
      namespace: appKey,
      observability: () => observability,
      downloadLogs: () => downloadLogs(logStore),
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
    ZenPlugin(),
  ]
    .filter(isTruthy)
    .flat();
};
