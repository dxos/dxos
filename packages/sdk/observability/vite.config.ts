//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    // Standalone entry: the log-writer worker imports the sink without dragging the rest of
    // the package (PostHog, providers) into its bundle.
    'otel-log-sink': 'src/extensions/otel/log-sink.ts',
  },
  test: { node: true },
});
