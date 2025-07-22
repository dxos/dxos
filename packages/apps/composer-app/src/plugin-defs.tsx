//
// Copyright 2024 DXOS.org
//

// NOTE(ZaymonFC): This is a workaround. See: https://discord.com/channels/837138313172353095/1363955461350621235
import '@dxos/plugin-inbox/css';

import { INTENT_PLUGIN, IntentPlugin, SETTINGS_PLUGIN, SettingsPlugin } from '@dxos/app-framework';
import { type Config, type ClientServicesProvider } from '@dxos/client';
import { type Observability } from '@dxos/observability';
import { AssistantPlugin, ASSISTANT_PLUGIN } from '@dxos/plugin-assistant';
import { AttentionPlugin, ATTENTION_PLUGIN } from '@dxos/plugin-attention';
import { AutomationPlugin, AUTOMATION_PLUGIN } from '@dxos/plugin-automation';
// TODO(burdon): Could BoardPlugin contain meta (e.g., BoardPlugin.meta.id)
import { BoardPlugin } from '@dxos/plugin-board';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ClientPlugin, CLIENT_PLUGIN } from '@dxos/plugin-client';
import { ConductorPlugin } from '@dxos/plugin-conductor';
import { DebugPlugin, DEBUG_PLUGIN } from '@dxos/plugin-debug';
import { DeckPlugin, DECK_PLUGIN } from '@dxos/plugin-deck';
import { ExcalidrawPlugin } from '@dxos/plugin-excalidraw';
import { ExplorerPlugin } from '@dxos/plugin-explorer';
import { FilesPlugin, FILES_PLUGIN } from '@dxos/plugin-files';
import { GraphPlugin, GRAPH_PLUGIN } from '@dxos/plugin-graph';
import { HelpPlugin, HELP_PLUGIN } from '@dxos/plugin-help';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { KanbanPlugin, KANBAN_PLUGIN } from '@dxos/plugin-kanban';
import { MapPlugin } from '@dxos/plugin-map';
import { MARKDOWN_PLUGIN, MarkdownPlugin } from '@dxos/plugin-markdown';
import { MeetingPlugin, MEETING_PLUGIN } from '@dxos/plugin-meeting';
import { MermaidPlugin } from '@dxos/plugin-mermaid';
import { NativePlugin, NATIVE_PLUGIN } from '@dxos/plugin-native';
import { NavTreePlugin, NAVTREE_PLUGIN } from '@dxos/plugin-navtree';
import { ObservabilityPlugin, OBSERVABILITY_PLUGIN } from '@dxos/plugin-observability';
import { OutlinerPlugin, OUTLINER_PLUGIN } from '@dxos/plugin-outliner';
import { PresenterPlugin } from '@dxos/plugin-presenter';
import { PreviewPlugin, PREVIEW_PLUGIN } from '@dxos/plugin-preview';
import { PwaPlugin, PWA_PLUGIN } from '@dxos/plugin-pwa';
import { RegistryPlugin, REGISTRY_PLUGIN } from '@dxos/plugin-registry';
import { ScriptPlugin } from '@dxos/plugin-script';
import { SearchPlugin } from '@dxos/plugin-search';
import { SheetPlugin, SHEET_PLUGIN } from '@dxos/plugin-sheet';
import { SketchPlugin, SKETCH_PLUGIN } from '@dxos/plugin-sketch';
import { SpacePlugin, SPACE_PLUGIN } from '@dxos/plugin-space';
import { StackPlugin } from '@dxos/plugin-stack';
import { StatusBarPlugin, STATUS_BAR_PLUGIN } from '@dxos/plugin-status-bar';
import { TablePlugin, TABLE_PLUGIN } from '@dxos/plugin-table';
import { ThemePlugin, THEME_PLUGIN } from '@dxos/plugin-theme';
import { ThemeEditorPlugin } from '@dxos/plugin-theme-editor';
import { ThreadPlugin, THREAD_PLUGIN } from '@dxos/plugin-thread';
import { TokenManagerPlugin, TOKEN_MANAGER_PLUGIN } from '@dxos/plugin-token-manager';
import { TranscriptionPlugin, TRANSCRIPTION_PLUGIN } from '@dxos/plugin-transcription';
import { WnfsPlugin, WNFS_PLUGIN } from '@dxos/plugin-wnfs';
import { isNotFalsy } from '@dxos/util';

import { steps } from './help';
import { WelcomePlugin, WELCOME_PLUGIN } from './plugins';

export type State = {
  appKey: string;
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

export const getCore = ({ isPwa, isSocket }: PluginConfig): string[] =>
  [
    ATTENTION_PLUGIN,
    AUTOMATION_PLUGIN,
    CLIENT_PLUGIN,
    DECK_PLUGIN,
    FILES_PLUGIN,
    GRAPH_PLUGIN,
    HELP_PLUGIN,
    INTENT_PLUGIN,
    isSocket && NATIVE_PLUGIN,
    NAVTREE_PLUGIN,
    OBSERVABILITY_PLUGIN,
    PREVIEW_PLUGIN,
    !isSocket && isPwa && PWA_PLUGIN,
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
    MARKDOWN_PLUGIN,
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
      MEETING_PLUGIN,
      OUTLINER_PLUGIN,
      TRANSCRIPTION_PLUGIN,
    ],
  ]
    .filter(isNotFalsy)
    .flat();

export const getPlugins = ({ appKey, config, services, observability, isDev, isLabs, isPwa, isSocket }: PluginConfig) =>
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
    isSocket && NativePlugin(),
    NavTreePlugin(),
    ObservabilityPlugin({ namespace: appKey, observability: () => observability }),
    OutlinerPlugin(),
    PresenterPlugin(),
    PreviewPlugin(),
    !isSocket && isPwa && PwaPlugin(),
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
