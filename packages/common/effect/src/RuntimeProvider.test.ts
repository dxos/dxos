//
// Copyright 2026 DXOS.org
//

import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import * as RuntimeProvider from './RuntimeProvider';

describe('RuntimeProvider', () => {
  test('traces an effect run through a context that carries no tracer', async () => {
    const exporter = new InMemorySpanExporter();
    const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
    // Stands in for whatever registers the app's provider — the tracer reads the OTel global, which
    // is a proxy, so registering one is all it takes for spans to become real.
    const { trace } = await import('@opentelemetry/api');
    trace.setGlobalTracerProvider(provider);

    try {
      // The shape `AiSession` uses: a context holding the caller's services and nothing else. `Effect.runPromise`
      // starts a fresh runtime, and `Tracer.Tracer` is a reference whose default discards every span —
      // so without help, work run this way is invisible however well the call sites annotate it.
      const runtime = Effect.succeed(Context.empty());
      await RuntimeProvider.runPromise(runtime)(Effect.void.pipe(Effect.withSpan('Test.span')));
      await provider.forceFlush();

      expect(exporter.getFinishedSpans().map(({ name }) => name)).toEqual(['Test.span']);
    } finally {
      trace.disable();
    }
  });
});
