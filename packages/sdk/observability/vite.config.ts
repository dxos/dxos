//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    // Kept off the root barrel, unlike the namespaces below: the parent branch's boot still
    // imports that barrel, and the boot set is the parse graph, so the AI sink would ride along.
    'ai/AiObservability': 'src/ai/AiObservability.ts',
    'Observability': 'src/Observability.ts',
    'ObservabilityExtension': 'src/ObservabilityExtension.ts',
    // Standalone for the same reason as the AI sink: a host attaching these to its own provider
    // should not pull the extensions in with them.
    'SpanProcessors': 'src/SpanProcessors.ts',
    'providers/ObservabilityClientProvider': 'src/providers/ObservabilityClientProvider.ts',
    'providers/ObservabilityProvider': 'src/providers/ObservabilityProvider.ts',
    'extensions/otel/OtelLogSink': 'src/extensions/otel/OtelLogSink.ts',
    'extensions/otel/OtelMetricsSink': 'src/extensions/otel/OtelMetricsSink.ts',
    'extensions/otel/OtelSpanSink': 'src/extensions/otel/OtelSpanSink.ts',
  },
  test: { node: true },
});
