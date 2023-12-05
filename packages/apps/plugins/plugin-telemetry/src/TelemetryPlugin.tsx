//
// Copyright 2023 DXOS.org
//

import { type ClientPluginProvides } from '@braneframe/plugin-client';
import { getPlugin, type PluginDefinition } from '@dxos/app-framework';
import { type Observability } from '@dxos/observability';

import meta from './meta';
import { type AppTelemetryOptions, initializeAppTelemetry, initializeAppObservability } from './telemetry';
import { useTelemetry } from './useTelemetry';

export const TelemetryPlugin = (options: AppTelemetryOptions): PluginDefinition => {
  let observability: Observability | undefined;
  // Initialize asynchronously in the background, not in plugin initialization.
  // Should not block application startup.
  void initializeAppTelemetry(options);

  return {
    meta,
    unload: async () => {
      await observability?.close();
    },
    ready: async (plugins) => {
      const clientPlugin = getPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client');

      observability = await initializeAppObservability(options, clientPlugin.provides.client);
    },
    provides: {
      root: () => {
        useTelemetry({ namespace: options.namespace });

        return null;
      },
    },
  };
};
