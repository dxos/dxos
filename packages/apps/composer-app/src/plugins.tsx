//
// Copyright 2024 DXOS.org
//

import { INTENT_PLUGIN, IntentPlugin, SETTINGS_PLUGIN, SettingsPlugin } from '@dxos/app-framework';
import { type Config, type ClientServicesProvider } from '@dxos/client';
import { type Observability } from '@dxos/observability';
import { AttentionPlugin, ATTENTION_PLUGIN } from '@dxos/plugin-attention';
import { AutomationPlugin } from '@dxos/plugin-automation';
import { CallsPlugin } from '@dxos/plugin-calls';
import { CanvasPlugin } from '@dxos/plugin-canvas';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ClientPlugin, CLIENT_PLUGIN } from '@dxos/plugin-client';
import { DebugPlugin, DEBUG_PLUGIN } from '@dxos/plugin-debug';
import { DeckPlugin, DECK_PLUGIN } from '@dxos/plugin-deck';
import { ExcalidrawPlugin } from '@dxos/plugin-excalidraw';
import { ExplorerPlugin } from '@dxos/plugin-explorer';
import { FilesPlugin, FILES_PLUGIN } from '@dxos/plugin-files';
import { GraphPlugin, GRAPH_PLUGIN } from '@dxos/plugin-graph';
import { HelpPlugin, HELP_PLUGIN } from '@dxos/plugin-help';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { KanbanPlugin } from '@dxos/plugin-kanban';
import { MapPlugin } from '@dxos/plugin-map';
import { MarkdownPlugin, MARKDOWN_PLUGIN } from '@dxos/plugin-markdown';
import { MermaidPlugin } from '@dxos/plugin-mermaid';
import { NativePlugin, NATIVE_PLUGIN } from '@dxos/plugin-native';
import { NavTreePlugin, NAVTREE_PLUGIN } from '@dxos/plugin-navtree';
import { ObservabilityPlugin, OBSERVABILITY_PLUGIN } from '@dxos/plugin-observability';
import { OutlinerPlugin } from '@dxos/plugin-outliner';
import { PresenterPlugin } from '@dxos/plugin-presenter';
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
import { WildcardPlugin, WILDCARD_PLUGIN } from '@dxos/plugin-wildcard';
import { WnfsPlugin, WNFS_PLUGIN } from '@dxos/plugin-wnfs';
import { isNotFalsy } from '@dxos/util';

import { steps } from './help';
import { WelcomePlugin, WELCOME_PLUGIN } from './plugins/welcome';

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

export const core = ({ isPwa, isSocket }: PluginConfig): string[] =>
  [
    ATTENTION_PLUGIN,
    CLIENT_PLUGIN,
    DECK_PLUGIN,
    FILES_PLUGIN,
    GRAPH_PLUGIN,
    HELP_PLUGIN,
    INTENT_PLUGIN,
    isSocket && NATIVE_PLUGIN,
    NAVTREE_PLUGIN,
    OBSERVABILITY_PLUGIN,
    !isSocket && isPwa && PWA_PLUGIN,
    REGISTRY_PLUGIN,
    SETTINGS_PLUGIN,
    SPACE_PLUGIN,
    STATUS_BAR_PLUGIN,
    THEME_PLUGIN,
    TOKEN_MANAGER_PLUGIN,
    WELCOME_PLUGIN,
    WILDCARD_PLUGIN,
  ].filter(isNotFalsy);

export const defaults = ({ isDev }: PluginConfig): string[] =>
  [
    // prettier-ignore
    isDev && DEBUG_PLUGIN,
    MARKDOWN_PLUGIN,
    SHEET_PLUGIN,
    SKETCH_PLUGIN,
    TABLE_PLUGIN,
    THREAD_PLUGIN,
    WNFS_PLUGIN,
  ].filter(isNotFalsy);

export const plugins = ({ appKey, config, services, observability, isDev, isPwa, isSocket }: PluginConfig) =>
  [
    AttentionPlugin(),
    AutomationPlugin(),
    CallsPlugin(),
    CanvasPlugin(),
    ChessPlugin(),
    ClientPlugin({
      config,
      services,
      onClientInitialized: async (_, client) => {
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
    DebugPlugin(),
    DeckPlugin(),
    ExcalidrawPlugin(),
    ExplorerPlugin(),
    FilesPlugin(),
    GraphPlugin(),
    HelpPlugin({ steps }),
    InboxPlugin(),
    IntentPlugin(),
    KanbanPlugin(),
    MapPlugin(),
    MarkdownPlugin(),
    MermaidPlugin(),
    isSocket && NativePlugin(),
    NavTreePlugin(),
    ObservabilityPlugin({ namespace: appKey, observability: () => observability }),
    OutlinerPlugin(),
    PresenterPlugin(),
    !isSocket && isPwa && PwaPlugin(),
    RegistryPlugin(),
    ScriptPlugin(),
    SearchPlugin(),
    SettingsPlugin(),
    SheetPlugin(),
    SketchPlugin(),
    SpacePlugin(),
    StackPlugin(),
    StatusBarPlugin(),
    ThemeEditorPlugin(),
    TablePlugin(),
    ThemePlugin({ appName: 'Composer', noCache: isDev }),
    ThreadPlugin(),
    TokenManagerPlugin(),
    WelcomePlugin(),
    WildcardPlugin(),
    WnfsPlugin(),
  ].filter(isNotFalsy);
