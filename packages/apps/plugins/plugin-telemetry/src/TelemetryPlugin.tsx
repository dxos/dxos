//
// Copyright 2023 DXOS.org
//

import { type PluginDefinition } from '@dxos/app-framework';

import meta from './meta';
import { type AppTelemetryOptions, initializeAppTelemetry } from './telemetry';
import { useTelemetry } from './useTelemetry';

export const TelemetryPlugin = (options: AppTelemetryOptions): PluginDefinition => {
  // Initialize asynchronously in the background, not in plugin initialization.
  // Should not block application startup.
  void initializeAppTelemetry(options);

  return {
    meta,
    provides: {
      root: () => {
        useTelemetry({ namespace: options.namespace });

        return null;
      },
    },
  };
};
