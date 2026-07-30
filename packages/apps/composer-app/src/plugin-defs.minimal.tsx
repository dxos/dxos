//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { AssistantPlugin } from '@dxos/plugin-assistant/plugin';
import { DebugPlugin } from '@dxos/plugin-debug/plugin';
import { DevtoolsPlugin } from '@dxos/plugin-devtools/plugin';
import { InboxPlugin } from '@dxos/plugin-inbox/plugin';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { OutlinerPlugin } from '@dxos/plugin-outliner/plugin';
import { PreviewPlugin } from '@dxos/plugin-preview/plugin';
import { ProjectsPlugin } from '@dxos/plugin-projects/plugin';
import { ReviewPlugin } from '@dxos/plugin-review/plugin';
import { RoutinePlugin } from '@dxos/plugin-routine/plugin';
import { ThreadPlugin } from '@dxos/plugin-thread/plugin';
import { isTruthy } from '@dxos/util';

import { type PluginConfig, getCorePlugins } from './plugin-defs.core';

export type { PluginConfig, State } from './plugin-defs.core';

/**
 * Plugin keys enabled by default for new users of the minimal set.
 */
export const getDefaults = ({ isDev }: PluginConfig): string[] =>
  [
    isDev && [DebugPlugin.meta.profile.key, DevtoolsPlugin.meta.profile.key],

    AssistantPlugin.meta.profile.key,
    MarkdownPlugin.meta.profile.key,
    OutlinerPlugin.meta.profile.key,
    ProjectsPlugin.meta.profile.key,
    ReviewPlugin.meta.profile.key,
    RoutinePlugin.meta.profile.key,
  ]
    .filter(isTruthy)
    .flat();

/**
 * Minimal plugin registry for fast dev startup (`serve-min`, DX_PLUGIN_SET=minimal):
 * core infrastructure + Assistant, Debug, Devtools, Inbox, Markdown, Outliner, Preview,
 * Projects, Review, Routine, and Thread. Keep the plugin list in sync with the
 * `optimizeDeps.entries` brace glob in vite.config.ts.
 * See `agents/superpowers/specs/2026-07-24-composer-serve-min-design.md`.
 */
export const getPlugins = (config: PluginConfig): Plugin.Plugin[] => [
  ...getCorePlugins(config),
  AssistantPlugin(),
  DebugPlugin({ logStore: config.logStore }),
  DevtoolsPlugin(),
  InboxPlugin(),
  MarkdownPlugin(),
  OutlinerPlugin(),
  PreviewPlugin(),
  ProjectsPlugin(),
  RoutinePlugin(),
  ThreadPlugin(),
  ReviewPlugin(),
];
