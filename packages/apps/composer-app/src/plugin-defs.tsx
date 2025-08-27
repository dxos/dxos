//
// Copyright 2024 DXOS.org
//

// NOTE(ZaymonFC): This is a workaround. See: https://discord.com/channels/837138313172353095/1363955461350621235
import '@dxos/plugin-inbox/css';

import { INTENT_PLUGIN, IntentPlugin, SETTINGS_PLUGIN, SettingsPlugin } from '@dxos/app-framework';
import { type ClientServicesProvider, type Config } from '@dxos/client';
import { type Observability } from '@dxos/observability';
import { ASSISTANT_PLUGIN, AssistantPlugin } from '@dxos/plugin-assistant';
import { ATTENTION_PLUGIN, AttentionPlugin } from '@dxos/plugin-attention';
import { AUTOMATION_PLUGIN, AutomationPlugin } from '@dxos/plugin-automation';
// TODO(burdon): Could BoardPlugin contain meta (e.g., BoardPlugin.meta.id)
import { BoardPlugin } from '@dxos/plugin-board';
import { ChessPlugin } from '@dxos/plugin-chess';
import { CLIENT_PLUGIN, ClientPlugin } from '@dxos/plugin-client';
import { ConductorPlugin } from '@dxos/plugin-conductor';
import { DEBUG_PLUGIN, DebugPlugin } from '@dxos/plugin-debug';
import { DECK_PLUGIN, DeckPlugin } from '@dxos/plugin-deck';
import { ExcalidrawPlugin } from '@dxos/plugin-excalidraw';
import { ExplorerPlugin } from '@dxos/plugin-explorer';
import { FILES_PLUGIN, FilesPlugin } from '@dxos/plugin-files';
import { GRAPH_PLUGIN, GraphPlugin } from '@dxos/plugin-graph';
import { HELP_PLUGIN, HelpPlugin } from '@dxos/plugin-help';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { KANBAN_PLUGIN, KanbanPlugin } from '@dxos/plugin-kanban';
import { MapPlugin } from '@dxos/plugin-map';
import { meta as MarkdownMeta, MarkdownPlugin } from '@dxos/plugin-markdown';
import { meta as MeetingMeta, MeetingPlugin } from '@dxos/plugin-meeting';
import { MermaidPlugin } from '@dxos/plugin-mermaid';
import { NATIVE_PLUGIN, NativePlugin } from '@dxos/plugin-native';
import { NAVTREE_PLUGIN, NavTreePlugin } from '@dxos/plugin-navtree';
import { OBSERVABILITY_PLUGIN, ObservabilityPlugin } from '@dxos/plugin-observability';
import { OUTLINER_PLUGIN, OutlinerPlugin } from '@dxos/plugin-outliner';
import { PresenterPlugin } from '@dxos/plugin-presenter';
import { PREVIEW_PLUGIN, PreviewPlugin } from '@dxos/plugin-preview';
import { PWA_PLUGIN, PwaPlugin } from '@dxos/plugin-pwa';
import { REGISTRY_PLUGIN, RegistryPlugin } from '@dxos/plugin-registry';
import { ScriptPlugin } from '@dxos/plugin-script';
import { SearchPlugin } from '@dxos/plugin-search';
import { SHEET_PLUGIN, SheetPlugin } from '@dxos/plugin-sheet';
import { SKETCH_PLUGIN, SketchPlugin } from '@dxos/plugin-sketch';
import { SPACE_PLUGIN, SpacePlugin } from '@dxos/plugin-space';
import { StackPlugin } from '@dxos/plugin-stack';
import { STATUS_BAR_PLUGIN, StatusBarPlugin } from '@dxos/plugin-status-bar';
import { TABLE_PLUGIN, TablePlugin } from '@dxos/plugin-table';
import { THEME_PLUGIN, ThemePlugin } from '@dxos/plugin-theme';
import { ThemeEditorPlugin } from '@dxos/plugin-theme-editor';
import { THREAD_PLUGIN, ThreadPlugin } from '@dxos/plugin-thread';
import { TOKEN_MANAGER_PLUGIN, TokenManagerPlugin } from '@dxos/plugin-token-manager';
import { meta as TranscriptionMeta, TranscriptionPlugin } from '@dxos/plugin-transcription';
import { WNFS_PLUGIN, WnfsPlugin } from '@dxos/plugin-wnfs';
import { isNotFalsy } from '@dxos/util';

import { steps } from './help';
import { WELCOME_PLUGIN, WelcomePlugin } from './plugins';

export type State = {
  appKey: string;
  config: Config;
  services: ClientServicesProvider;
  observability: Promise<Observability>;
};

export type PluginConfig = State & {
  isDev?: boolean;
  isPwa?: boolean;
  isTauri?: boolean;
  isLabs?: boolean;
  isStrict?: boolean;
};

export const getCore = ({ isPwa, isTauri }: PluginConfig): string[] =>
  [
    ATTENTION_PLUGIN,
    AUTOMATION_PLUGIN,
    CLIENT_PLUGIN,
    DECK_PLUGIN,
    FILES_PLUGIN,
    GRAPH_PLUGIN,
    HELP_PLUGIN,
    INTENT_PLUGIN,
    isTauri && NATIVE_PLUGIN,
    NAVTREE_PLUGIN,
    OBSERVABILITY_PLUGIN,
    PREVIEW_PLUGIN,
    !isTauri && isPwa && PWA_PLUGIN,
    REGISTRY_PLUGIN,
    SETTINGS_PLUGIN,
    SPACE_PLUGIN,
    STATUS_BAR_PLUGIN,
    THEME_PLUGIN,
    TOKEN_MANAGER_PLUGIN,
    WELCOME_PLUGIN,
  ]
    .filter(isNotFalsy)
    .flat();

export const getDefaults = ({ isDev, isLabs }: PluginConfig): string[] =>
  [
    // Default
    KANBAN_PLUGIN,
    MarkdownMeta.id,
    SHEET_PLUGIN,
    SKETCH_PLUGIN,
    TABLE_PLUGIN,
    THREAD_PLUGIN,
    WNFS_PLUGIN,

    // Dev
    isDev && DEBUG_PLUGIN,

    // Labs
    (isDev || isLabs) && [
      // prettier-ignore
      ASSISTANT_PLUGIN,
      MeetingMeta.id,
      OUTLINER_PLUGIN,
      TranscriptionMeta.id,
    ],
  ]
    .filter(isNotFalsy)
    .flat();

export const getPlugins = ({ appKey, config, services, observability, isDev, isLabs, isPwa, isTauri }: PluginConfig) =>
  [
    AssistantPlugin(),
    AttentionPlugin(),
    AutomationPlugin(),
    BoardPlugin(),
    ChessPlugin(),
    ClientPlugin({
      config,
      services,
      onReset: ({ target }) => {
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
    ConductorPlugin(),
    DebugPlugin(),
    DeckPlugin(),
    isLabs && ExcalidrawPlugin(),
    ExplorerPlugin(),
    isLabs && FilesPlugin(),
    GraphPlugin(),
    HelpPlugin({ steps }),
    InboxPlugin(),
    IntentPlugin(),
    KanbanPlugin(),
    MapPlugin(),
    MarkdownPlugin(),
    MeetingPlugin(),
    MermaidPlugin(),
    isTauri && NativePlugin(),
    NavTreePlugin(),
    ObservabilityPlugin({ namespace: appKey, observability: () => observability }),
    OutlinerPlugin(),
    PresenterPlugin(),
    PreviewPlugin(),
    !isTauri && isPwa && PwaPlugin(),
    RegistryPlugin(),
    ScriptPlugin(),
    isLabs && SearchPlugin(),
    SettingsPlugin(),
    SheetPlugin(),
    SketchPlugin(),
    SpacePlugin({ observability: true }),
    StackPlugin(),
    StatusBarPlugin(),
    ThemeEditorPlugin(),
    TablePlugin(),
    ThemePlugin({ appName: 'Composer', noCache: isDev }),
    ThreadPlugin(),
    TokenManagerPlugin(),
    TranscriptionPlugin(),
    WelcomePlugin(),
    WnfsPlugin(),
  ]
    .filter(isNotFalsy)
    .flat();
