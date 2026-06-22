//
// Copyright 2025 DXOS.org
//

import { type Plugin, ProcessManagerPlugin } from '@dxos/app-framework';
import { type Config } from '@dxos/client';
import { ChessPlugin } from '@dxos/plugin-chess/plugin';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { InboxPlugin } from '@dxos/plugin-inbox/plugin';
import { IntegrationPlugin } from '@dxos/plugin-integration/plugin';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { ObservabilityPlugin } from '@dxos/plugin-observability/plugin';
import { RegistryPlugin } from '@dxos/plugin-registry/plugin';
import { RoutinePlugin } from '@dxos/plugin-routine/plugin';
import { SamplePlugin } from '@dxos/plugin-sample/plugin';
import { SpacePlugin } from '@dxos/plugin-space/plugin';

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
    ChessPlugin(),
    ClientPlugin({ config }),
    InboxPlugin(),
    IntegrationPlugin(),
    MarkdownPlugin(),
    // TODO(wittjosiah): Align browser and node variant option types for ObservabilityPlugin.
    ObservabilityPlugin({} as any),
    ProcessManagerPlugin(),
    RegistryPlugin(),
    RoutinePlugin(),
    SamplePlugin(),
    SpacePlugin({}),
  ];
};
