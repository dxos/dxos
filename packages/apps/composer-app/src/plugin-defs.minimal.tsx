//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { AssistantPlugin } from '@dxos/plugin-assistant/plugin';
import { CommentsPlugin } from '@dxos/plugin-comments/plugin';
import { InboxPlugin } from '@dxos/plugin-inbox/plugin';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { ThreadPlugin } from '@dxos/plugin-thread/plugin';

import { type PluginConfig, getCorePlugins } from './plugin-defs.core';

export type { PluginConfig, State } from './plugin-defs.core';

/**
 * Minimal plugin registry for fast dev startup (`serve-min`, DX_PLUGIN_SET=minimal):
 * core infrastructure + Assistant, Comments, Inbox, Markdown, and Thread. Keep the
 * plugin list in sync with the `optimizeDeps.entries` brace glob in vite.config.ts.
 * See `agents/superpowers/specs/2026-07-24-composer-serve-min-design.md`.
 */
export const getPlugins = (config: PluginConfig): Plugin.Plugin[] => [
  ...getCorePlugins(config),
  AssistantPlugin(),
  CommentsPlugin(),
  InboxPlugin(),
  MarkdownPlugin(),
  ThreadPlugin(),
];

/**
 * Plugin keys enabled by default for new users of the minimal set.
 */
export const getDefaults = (_: PluginConfig): string[] => [
  AssistantPlugin.meta.profile.key,
  MarkdownPlugin.meta.profile.key,
];
