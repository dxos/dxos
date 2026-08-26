//
// Copyright 2025 DXOS.org
//

import { ProcessManagerPlugin } from '@dxos/app-framework';
import type * as Plugin from '@dxos/app-framework/Plugin';
import { type Config } from '@dxos/client';
import * as ChessPlugin from '@dxos/plugin-chess/ChessPlugin';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as ConnectorPlugin from '@dxos/plugin-connector/ConnectorPlugin';
import * as InboxPlugin from '@dxos/plugin-inbox/InboxPlugin';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as ObservabilityPlugin from '@dxos/plugin-observability/ObservabilityPlugin';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import * as RegistryPlugin from '@dxos/plugin-registry/RegistryPlugin';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import * as SamplePlugin from '@dxos/plugin-sample/SamplePlugin';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';

export type PluginConfig = {
  config?: Config;
  isDev?: boolean;
  isLabs?: boolean;
  isStrict?: boolean;
};

/**
 * Plugins `dx` pins on: always enabled, never disableable.
 *
 * Supplied explicitly rather than inherited from each plugin's `system` tag, because that tag is
 * declared once in a plugin's `dx.config.ts` for every host — so the tag alone made `observability`,
 * `connector` and `routine` non-disableable in the CLI purely because they are non-disableable in
 * Composer. Only these four are load-bearing for `dx` itself: the client every command reaches for,
 * the registry that contributes `dx plugin` (disabling it would strand the user with no way back),
 * spaces, and the process manager.
 */
export const getCore = (): string[] => [
  ClientPlugin.meta.profile.key,
  ProcessManagerPlugin.meta.profile.key,
  RegistryPlugin.meta.profile.key,
  SpacePlugin.meta.profile.key,
];

/**
 * Plugins enabled on a profile that has never been configured. Everything here is disableable;
 * `getCore` is added on top by the manager.
 *
 * Chess and Sample are deliberately absent: they are demos, and a fresh `dx --help` should list
 * work verbs rather than a chess game. `dx plugin enable` turns them on.
 */
export const getDefaults = (): string[] => [
  ConnectorPlugin.meta.profile.key,
  InboxPlugin.meta.profile.key,
  MarkdownPlugin.meta.profile.key,
  ObservabilityPlugin.meta.profile.key,
  ProjectsPlugin.meta.profile.key,
  RoutinePlugin.meta.profile.key,
  TasksPlugin.meta.profile.key,
];

export const getPlugins = ({ config }: PluginConfig): Plugin.Plugin[] => {
  return [
    ChessPlugin.make(),
    // Commands are imperative and run straight through, so the service must hand them a client
    // that is already initialized rather than one whose `halo` getter still throws.
    ClientPlugin.make({ config, awaitInitialization: true }),
    ConnectorPlugin.make(),
    InboxPlugin.make(),
    MarkdownPlugin.make(),
    // TODO(wittjosiah): Align browser and node variant option types for ObservabilityPlugin.
    ObservabilityPlugin.make({} as any),
    ProcessManagerPlugin(),
    ProjectsPlugin.make(),
    RegistryPlugin.make(),
    RoutinePlugin.make(),
    SamplePlugin.make(),
    SpacePlugin.make({}),
    TasksPlugin.make(),
  ];
};
