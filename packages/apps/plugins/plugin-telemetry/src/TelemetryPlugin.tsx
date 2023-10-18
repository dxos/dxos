//
// Copyright 2023 DXOS.org
//

import { type PluginDefinition } from '@dxos/react-surface';

import { type AppTelemetryOptions, initializeAppTelemetry } from './telemetry';
import { useTelemetry } from './useTelemetry';

export const TelemetryPlugin = (options: AppTelemetryOptions): PluginDefinition => {
  // Initialize asynchronously in the background, not in plugin initialization.
  // Should not block application startup.
  void initializeAppTelemetry(options);

  return {
    meta: {
      id: 'dxos.org/plugin/telemetry',
    },
    provides: {
      components: {
        default: () => {
          useTelemetry({ namespace: options.namespace });

          return null;
        },
      },
    },
  };
};
