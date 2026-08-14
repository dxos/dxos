//
// Copyright 2026 DXOS.org
//

import type * as Plugin from '@dxos/app-framework/Plugin';
import * as AssistantPlugin from '@dxos/plugin-assistant/AssistantPlugin';
import * as DebugPlugin from '@dxos/plugin-debug/DebugPlugin';
import * as DevtoolsPlugin from '@dxos/plugin-devtools/DevtoolsPlugin';
import * as GooglePlugin from '@dxos/plugin-google/GooglePlugin';
import * as InboxPlugin from '@dxos/plugin-inbox/InboxPlugin';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as PreviewPlugin from '@dxos/plugin-preview/PreviewPlugin';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as ReviewPlugin from '@dxos/plugin-review/ReviewPlugin';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import * as ThreadPlugin from '@dxos/plugin-thread/ThreadPlugin';
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
    TasksPlugin.meta.profile.key,
    ProjectsPlugin.meta.profile.key,
    ReviewPlugin.meta.profile.key,
    RoutinePlugin.meta.profile.key,
    // The Inbox's mail provider, defaulted on like the full set does: a mailbox offers no Connect
    // action unless some registered connector claims its type, so enabling Inbox alone yields a
    // mailbox nothing can bind. Headless, so it costs a capability module and no UI.
    GooglePlugin.meta.profile.key,
  ]
    .filter(isTruthy)
    .flat();

/**
 * Minimal plugin registry for fast dev startup (opt-in via DX_PLUGIN_SET=minimal):
 * core infrastructure + Assistant, Debug, Devtools, Google, Inbox, Markdown, Preview,
 * Projects, Review, Routine, Tasks, and Thread. Google is the Inbox's mail provider —
 * a mailbox is inert without one, and the provider is a separate plugin.
 */
export const getPlugins = (config: PluginConfig): Plugin.Plugin[] => {
  const { logStore } = config;
  return [
    ...getCorePlugins(config),
    AssistantPlugin.make(),
    DebugPlugin.make({ logStore }),
    DevtoolsPlugin.make(),
    GooglePlugin.make(),
    InboxPlugin.make(),
    MarkdownPlugin.make(),
    TasksPlugin.make(),
    PreviewPlugin.make(),
    ProjectsPlugin.make(),
    RoutinePlugin.make(),
    ThreadPlugin.make(),
    ReviewPlugin.make(),
  ];
};
