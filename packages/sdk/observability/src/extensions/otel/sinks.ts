//
// Copyright 2026 DXOS.org
//

// Worker-only sink entrypoints, kept out of `./index.ts` so the extension does not import them.
export * as OtelLogSink from './OtelLogSink.ts';
export * as OtelMetricsSink from './OtelMetricsSink.ts';
export * as OtelSpanSink from './OtelSpanSink.ts';
