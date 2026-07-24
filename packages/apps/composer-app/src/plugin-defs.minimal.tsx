//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Plugin, ProcessManagerPlugin } from '@dxos/app-framework';
import { AssistantPlugin } from '@dxos/plugin-assistant/plugin';
import { AttentionPlugin } from '@dxos/plugin-attention/plugin';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { DeckPlugin } from '@dxos/plugin-deck/plugin';
import { GraphPlugin } from '@dxos/plugin-graph/plugin';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { NavTreePlugin } from '@dxos/plugin-navtree/plugin';
import { ObservabilityPlugin } from '@dxos/plugin-observability/plugin';
import { OnboardingPlugin } from '@dxos/plugin-onboarding/plugin';
import { RegistryPlugin } from '@dxos/plugin-registry/plugin';
import { SettingsPlugin } from '@dxos/plugin-settings/plugin';
import { SpacePlugin } from '@dxos/plugin-space/plugin';
import { StatusBarPlugin } from '@dxos/plugin-status-bar/plugin';
import { ThemePlugin } from '@dxos/plugin-theme/plugin';
import { ThreadPlugin } from '@dxos/plugin-thread/plugin';
import { isTruthy } from '@dxos/util';

// Type-only import: erased at transform time, so the DX_PLUGIN_SET=minimal
// alias on `./plugin-defs` cannot self-loop.
import { type PluginConfig } from './plugin-defs';
import { downloadLogs } from './util';

/**
 * Minimal plugin registry for fast dev startup (`serve-min`, DX_PLUGIN_SET=minimal):
 * core infrastructure + Markdown + Assistant. See
 * `agents/superpowers/specs/2026-07-24-composer-serve-min-design.md`.
 */
export const getDefaults = (_: PluginConfig): string[] => [
  AssistantPlugin.meta.profile.key,
  MarkdownPlugin.meta.profile.key,
];

export const getPlugins = ({
  appKey,
  config,
  services,
  observability,
  logStore,
  isDev,
  isMobile,
}: PluginConfig): Plugin.Plugin[] => {
  return [
    AssistantPlugin(),
    AttentionPlugin(),
    ClientPlugin({
      config,
      services,
      shareableLinkOrigin: window.location.origin,
      onReset: () =>
        Effect.sync(() => {
          localStorage.clear();
          window.location.pathname = '/';
        }),
    }),
    DeckPlugin(),
    GraphPlugin(),
    MarkdownPlugin(),
    NavTreePlugin(),
    ObservabilityPlugin({
      namespace: appKey,
      observability: () => observability,
      downloadLogs: () => downloadLogs(logStore),
    }),
    OnboardingPlugin({ generateExemplarSpace: false }),
    ProcessManagerPlugin(),
    RegistryPlugin(),
    SettingsPlugin(),
    SpacePlugin({
      observability: true,
      shareableLinkOrigin: window.location.origin,
    }),
    StatusBarPlugin(),
    ThemePlugin({
      appName: 'Composer',
      noCache: isDev,
      platform: isMobile ? 'mobile' : 'desktop',
    }),
    ThreadPlugin(),
  ].filter(isTruthy);
};
