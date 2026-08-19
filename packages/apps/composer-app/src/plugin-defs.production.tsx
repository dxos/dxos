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

import { type PluginConfig, getCorePlugins } from './plugin-defs.core';

export type { PluginConfig, State } from './plugin-defs.core';

/**
 * Where an object this set cannot open can be opened. The full catalog ships to nightly, and both
 * environments point at the same backend (DX-1144), so the object really is there.
 */
const EXTENSIBLE_APP_URL = 'https://nightly.composer.space/';

/**
 * Curated set `composer.space` ships (opt-in via `DX_PLUGIN_SET=production`; also the local
 * `serve-min` inner loop, so the fast loop is the one that matches production): core
 * infrastructure plus Assistant, Markdown, Projects, Review, Tasks (which owns the outliner) and
 * Thread.
 *
 * Selection is build-time, not a runtime flag: a flag would hide the registry UI while still
 * bundling every plugin, so the small-bundle half of the goal would never land. Hiding the
 * registry is a consequence — it lives in `plugin-defs.tsx`, the full set.
 *
 * Deliberately absent: `inbox` + its `google` / `jmap` mail providers (not yet vetted for
 * production), and the dev-only `debug`, `devtools`, `sample`, `computer` and `sidekick`.
 */
export const getPlugins = (config: PluginConfig): Plugin.Plugin[] => [
  ...getCorePlugins({ ...config, extensibleAppUrl: EXTENSIBLE_APP_URL }),
  AssistantPlugin.make(),
  MarkdownPlugin.make(),
  ProjectsPlugin.make(),
  ReviewPlugin.make(),
  TasksPlugin.make(),
  ThreadPlugin.make(),
];

/**
 * Every bundled plugin key. With no registry there is no toggle UI, so bundled == enabled, always —
 * derived from {@link getPlugins} rather than listed again so the two cannot drift. Core plugins are
 * `tags: ['system']` and force-enabled regardless; including them here is harmless and keeps the
 * invariant one expression rather than a filter that has to stay in step with the tag.
 */
export const getDefaults = (config: PluginConfig): string[] => getPlugins(config).map(({ meta }) => meta.profile.key);
