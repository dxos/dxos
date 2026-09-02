//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'observability': 'src/observability.ts',
    'observability-extension': 'src/observability-extension.ts',
    'providers': 'src/providers/index.ts',
    'extensions/otel/OtelLogSink': 'src/extensions/otel/OtelLogSink.ts',
    'extensions/otel/OtelMetricsSink': 'src/extensions/otel/OtelMetricsSink.ts',
    'extensions/otel/OtelSpanSink': 'src/extensions/otel/OtelSpanSink.ts',
  },
  test: { node: true },
});
