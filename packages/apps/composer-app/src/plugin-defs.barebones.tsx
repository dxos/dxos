//
// Copyright 2026 DXOS.org
//

import type * as Plugin from '@dxos/app-framework/Plugin';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';

import { type PluginConfig, getCorePlugins } from './plugin-defs.core';

export type { PluginConfig, State } from './plugin-defs.core';

/**
 * Plugin keys enabled by default for new users of the barebones set.
 */
export const getDefaults = (_: PluginConfig): string[] => [MarkdownPlugin.meta.profile.key];

/**
 * Barebones plugin registry for memory-floor profiling (DX_PLUGIN_SET=barebones): core
 * infrastructure + Markdown, nothing else. Establishes the minimum footprint of the shell so
 * per-plugin cost can be measured as a delta against it.
 */
export const getPlugins = (config: PluginConfig): Plugin.Plugin[] => {
  return [...getCorePlugins(config), MarkdownPlugin()];
};
