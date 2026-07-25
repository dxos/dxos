//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { AssistantPlugin } from '@dxos/plugin-assistant/plugin';
import { CommentsPlugin } from '@dxos/plugin-comments/plugin';
import { DebugPlugin } from '@dxos/plugin-debug/plugin';
import { InboxPlugin } from '@dxos/plugin-inbox/plugin';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { OutlinerPlugin } from '@dxos/plugin-outliner/plugin';
import { ProjectsPlugin } from '@dxos/plugin-projects/plugin';
import { RoutinePlugin } from '@dxos/plugin-routine/plugin';
import { ThreadPlugin } from '@dxos/plugin-thread/plugin';
import { VersioningPlugin } from '@dxos/plugin-versioning/plugin';

import { type PluginConfig, getCorePlugins } from './plugin-defs.core';

export type { PluginConfig, State } from './plugin-defs.core';

/**
 * Minimal plugin registry for fast dev startup (`serve-min`, DX_PLUGIN_SET=minimal):
 * core infrastructure + Assistant, Comments, Debug, Inbox, Markdown, Outliner, Projects,
 * Routine, and Thread. Keep the plugin list in sync with the `optimizeDeps.entries` brace
 * glob in vite.config.ts.
 * See `agents/superpowers/specs/2026-07-24-composer-serve-min-design.md`.
 */
export const getPlugins = (config: PluginConfig): Plugin.Plugin[] => [
  ...getCorePlugins(config),
  AssistantPlugin(),
  CommentsPlugin(),
  DebugPlugin({ logStore: config.logStore }),
  InboxPlugin(),
  MarkdownPlugin(),
  OutlinerPlugin(),
  ProjectsPlugin(),
  RoutinePlugin(),
  ThreadPlugin(),
  VersioningPlugin(),
];

/**
 * Plugin keys enabled by default for new users of the minimal set.
 */
export const getDefaults = (_: PluginConfig): string[] => [
  AssistantPlugin.meta.profile.key,
  MarkdownPlugin.meta.profile.key,
  OutlinerPlugin.meta.profile.key,
  ProjectsPlugin.meta.profile.key,
  RoutinePlugin.meta.profile.key,
];
