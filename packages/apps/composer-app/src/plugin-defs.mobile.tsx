//
// Copyright 2026 DXOS.org
//

import type * as Plugin from '@dxos/app-framework/Plugin';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import * as TranscriptionPlugin from '@dxos/plugin-transcription/TranscriptionPlugin';

import { type PluginConfig, getCorePlugins } from './plugin-defs.core';

export type { PluginConfig, State } from './plugin-defs.core';

/**
 * Fixed mobile set — not extensible, no registry: core infrastructure (with `isMobile` selecting
 * headless Deck + `MobilePlugin` as the root renderer) plus Assistant (chat), Markdown (chat
 * content), Projects with the Tasks it declares as a dependency, and Transcription (voice input).
 * Selection is build-time — swapping this file in via `DX_PLUGIN_SET=mobile` — rather than a
 * runtime flag, so a plugin with no mobile surface never enters the bundle.
 */
export const getPlugins = (config: PluginConfig): Plugin.Plugin[] => [
  ...getCorePlugins({ ...config, isExtensible: false }),
  // `Agent` and `Sequence` are unfinished, so the mobile set does not offer creating them either.
  AssistantPlugin.make({ experimentalTypes: false }),
  MarkdownPlugin.make(),
  ProjectsPlugin.make(),
  TasksPlugin.make(),
  TranscriptionPlugin.make(),
];

/**
 * Plugin keys enabled by default for the mobile set — the same plugins listed in
 * {@link getPlugins}.
 */
export const getDefaults = (_: PluginConfig): string[] => [
  AssistantPlugin.meta.profile.key,
  MarkdownPlugin.meta.profile.key,
  ProjectsPlugin.meta.profile.key,
  TasksPlugin.meta.profile.key,
  TranscriptionPlugin.meta.profile.key,
];
