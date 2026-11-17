//
// Copyright 2026 DXOS.org
//

// Worker-only entrypoints (the sinks and the OTLP proxy), kept out of `./index.ts` so the extension does not import them.
export * as OtelLogSink from './OtelLogSink.ts';
export * as OtelMetricsSink from './OtelMetricsSink.ts';
export * as OtelProxy from './OtelProxy.ts';
export * as OtelSpanSink from './OtelSpanSink.ts';
