//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    // Standalone entries: the telemetry worker imports the sinks without dragging the rest
    // of the package (PostHog, providers) into its bundle.
    'otel-log-sink': 'src/extensions/otel/log-sink.ts',
    'otel-metrics-sink': 'src/extensions/otel/metrics-sink.ts',
    'otel-span-sink': 'src/extensions/otel/span-sink.ts',
  },
  test: { node: true },
});
