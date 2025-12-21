//
// Copyright 2024 DXOS.org
//

// NOTE(ZaymonFC): Workaround; see: https://discord.com/channels/837138313172353095/1363955461350621235
import '@dxos/plugin-inbox/css';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { type ClientServicesProvider, type Config } from '@dxos/client';
import { type Observability } from '@dxos/observability';
import { AssistantPlugin } from '@dxos/plugin-assistant';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { AutomationPlugin } from '@dxos/plugin-automation';
import { BoardPlugin } from '@dxos/plugin-board';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ClientPlugin, type ClientPluginOptions } from '@dxos/plugin-client';
import { ConductorPlugin } from '@dxos/plugin-conductor';
import { DebugPlugin } from '@dxos/plugin-debug';
import { DeckPlugin } from '@dxos/plugin-deck';
import { ExcalidrawPlugin } from '@dxos/plugin-excalidraw';
import { ExplorerPlugin } from '@dxos/plugin-explorer';
import { FilesPlugin } from '@dxos/plugin-files';
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
import { NavTreePlugin } from '@dxos/plugin-navtree';
import { ObservabilityPlugin } from '@dxos/plugin-observability';
import { OutlinerPlugin } from '@dxos/plugin-outliner';
import { PresenterPlugin } from '@dxos/plugin-presenter';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { ProjectPlugin } from '@dxos/plugin-project';
import { PwaPlugin } from '@dxos/plugin-pwa';
import { RegistryPlugin } from '@dxos/plugin-registry';
import { ScriptPlugin } from '@dxos/plugin-script';
import { SearchPlugin } from '@dxos/plugin-search';
import { SheetPlugin } from '@dxos/plugin-sheet';
import { SketchPlugin } from '@dxos/plugin-sketch';
import { SpacePlugin } from '@dxos/plugin-space';
import { StackPlugin } from '@dxos/plugin-stack';
import { StatusBarPlugin } from '@dxos/plugin-status-bar';
import { TablePlugin } from '@dxos/plugin-table';
import { ThemePlugin } from '@dxos/plugin-theme';
import { ThemeEditorPlugin } from '@dxos/plugin-theme-editor';
import { ThreadPlugin } from '@dxos/plugin-thread';
import { TokenManagerPlugin } from '@dxos/plugin-token-manager';
import { TranscriptionPlugin } from '@dxos/plugin-transcription';
import { WnfsPlugin } from '@dxos/plugin-wnfs';
import { isTruthy } from '@dxos/util';

import { steps } from './help';
import { WelcomePlugin } from './plugins';

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
    AttentionPlugin.meta.id,
    AutomationPlugin.meta.id,
    ClientPlugin.meta.id,
    DeckPlugin.meta.id,
    FilesPlugin.meta.id,
    GraphPlugin.meta.id,
    HelpPlugin.meta.id,
    IntentPlugin.meta.id,
    isTauri && NativePlugin.meta.id,
    NavTreePlugin.meta.id,
    ObservabilityPlugin.meta.id,
    PreviewPlugin.meta.id,
    !isTauri && isPwa && PwaPlugin.meta.id,
    RegistryPlugin.meta.id,
    SettingsPlugin.meta.id,
    SpacePlugin.meta.id,
    StatusBarPlugin.meta.id,
    ThemePlugin.meta.id,
    TokenManagerPlugin.meta.id,
    WelcomePlugin.meta.id,
  ]
    .filter(isTruthy)
    .flat();

export const getDefaults = ({ isDev, isLabs }: PluginConfig): string[] =>
  [
    // Default
    KanbanPlugin.meta.id,
    MarkdownPlugin.meta.id,
    MasonryPlugin.meta.id,
    SheetPlugin.meta.id,
    SketchPlugin.meta.id,
    TablePlugin.meta.id,
    ThreadPlugin.meta.id,
    WnfsPlugin.meta.id,

    // Dev
    isDev && DebugPlugin.meta.id,

    // Labs
    (isDev || isLabs) && [
      AssistantPlugin.meta.id,
      ProjectPlugin.meta.id,
      MeetingPlugin.meta.id,
      OutlinerPlugin.meta.id,
      TranscriptionPlugin.meta.id,
    ],
  ]
    .filter(isTruthy)
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
      onReset: handleReset,
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
    isLabs && MapPluginSolid(),
    MarkdownPlugin(),
    MasonryPlugin(),
    MeetingPlugin(),
    MermaidPlugin(),
    isTauri && NativePlugin(),
    NavTreePlugin(),
    ObservabilityPlugin({
      namespace: appKey,
      observability: () => observability,
    }),
    OutlinerPlugin(),
    PresenterPlugin(),
    PreviewPlugin(),
    !isTauri && isPwa && PwaPlugin(),
    ProjectPlugin(),
    RegistryPlugin(),
    ScriptPlugin(),
    isLabs && SearchPlugin(),
    SettingsPlugin(),
    SheetPlugin(),
    SketchPlugin(),
    SpacePlugin({
      observability: true,
    }),
    StackPlugin(),
    StatusBarPlugin(),
    ThemeEditorPlugin(),
    TablePlugin(),
    ThemePlugin({
      appName: 'Composer',
      noCache: isDev,
    }),
    ThreadPlugin(),
    TokenManagerPlugin(),
    TranscriptionPlugin(),
    WelcomePlugin(),
    WnfsPlugin(),
  ]
    .filter(isTruthy)
    .flat();

const handleReset: ClientPluginOptions['onReset'] = ({ target }) => {
  localStorage.clear();
  if (target === 'deviceInvitation') {
    window.location.assign(new URL('/?deviceInvitationCode=', window.location.origin));
  } else if (target === 'recoverIdentity') {
    window.location.assign(new URL('/?recoverIdentity=true', window.location.origin));
  } else {
    window.location.pathname = '/';
  }
};
