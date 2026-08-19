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
 * Curated set `composer.space` ships (opt-in via `DX_PLUGIN_SET=production`; also the local
 * `serve-min` inner loop and every iOS build, so the fast loop is the one that matches production):
 * core infrastructure plus Assistant, Markdown, Projects, Review, Tasks (which owns the outliner),
 * Thread and Transcription.
 *
 * Selection is build-time, not a runtime flag: a flag would hide the registry UI while still
 * bundling every plugin, so the small-bundle half of the goal would never land. `isExtensible`
 * additionally withholds the registry itself, which core carries for both sets.
 *
 * Deliberately absent: `inbox` + its `google` / `jmap` mail providers (not yet vetted for
 * production), and the dev-only `debug`, `devtools`, `sample`, `computer` and `sidekick`.
 */
export const getPlugins = (config: PluginConfig): Plugin.Plugin[] => [
  ...getCorePlugins({ ...config, isExtensible: false }),
  AssistantPlugin.make(),
  MarkdownPlugin.make(),
  ProjectsPlugin.make(),
  ReviewPlugin.make(),
  TasksPlugin.make(),
  ThreadPlugin.make(),
  TranscriptionPlugin.make(),
];

/**
 * Every bundled plugin key. With no registry there is no toggle UI, so bundled == enabled, always —
 * derived from {@link getPlugins} rather than listed again so the two cannot drift. Core plugins are
 * `tags: ['system']` and force-enabled regardless; including them here is harmless and keeps the
 * invariant one expression rather than a filter that has to stay in step with the tag.
 */
export const getDefaults = (config: PluginConfig): string[] => getPlugins(config).map(({ meta }) => meta.profile.key);
