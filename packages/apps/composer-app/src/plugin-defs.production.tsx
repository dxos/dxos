//
// Copyright 2026 DXOS.org
//

import type * as Plugin from '@dxos/app-framework/Plugin';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as ReviewPlugin from '@dxos/plugin-review/ReviewPlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import * as ThreadPlugin from '@dxos/plugin-thread/ThreadPlugin';
import * as TranscriptionPlugin from '@dxos/plugin-transcription/TranscriptionPlugin';

import { type PluginConfig, getCorePlugins } from './plugin-defs.core';

export type { PluginConfig, State } from './plugin-defs.core';

/**
 * Curated set `composer.space` (and every iOS build) ships. Selection is build-time — swapping this
 * file in via `DX_PLUGIN_SET=production` — rather than a runtime flag, so a non-shipped plugin never
 * enters the bundle.
 */
export const getPlugins = (config: PluginConfig): Plugin.Plugin[] => [
  ...getCorePlugins({ ...config, externalPlugins: false }),
  // `Agent` and `Sequence` are unfinished, so the curated set does not offer creating them.
  AssistantPlugin.make({ experimentalTypes: false }),
  MarkdownPlugin.make(),
  ProjectsPlugin.make(),
  ReviewPlugin.make(),
  TasksPlugin.make(),
  ThreadPlugin.make(),
  TranscriptionPlugin.make(),
];

export const getDefaults = (config: PluginConfig): string[] => getPlugins(config).map(({ meta }) => meta.profile.key);
