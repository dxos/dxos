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
import * as RegistryPlugin from '@dxos/plugin-registry/RegistryPlugin';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import * as SamplePlugin from '@dxos/plugin-sample/SamplePlugin';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';

export type PluginConfig = {
  config?: Config;
  isDev?: boolean;
  isLabs?: boolean;
  isStrict?: boolean;
};

export const getDefaults = (): string[] => [
  ChessPlugin.meta.profile.key,
  SamplePlugin.meta.profile.key,
  InboxPlugin.meta.profile.key,
  MarkdownPlugin.meta.profile.key,
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
    RegistryPlugin.make(),
    RoutinePlugin.make(),
    SamplePlugin.make(),
    SpacePlugin.make({}),
  ];
};
