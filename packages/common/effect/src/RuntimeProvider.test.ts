//
// Copyright 2026 DXOS.org
//

import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import { describe, expect, test } from 'vitest';

import * as RuntimeProvider from './RuntimeProvider.ts';

describe('RuntimeProvider', () => {
  test('traces an effect run through a context that carries no tracer', async () => {
    const exporter = new InMemorySpanExporter();
    const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
    const { trace } = await import('@opentelemetry/api');
    trace.setGlobalTracerProvider(provider);

    try {
      const runtime = Effect.succeed(Context.empty());
      await RuntimeProvider.runPromise(runtime)(Effect.void.pipe(Effect.withSpan('Test.span')));
      await provider.forceFlush();

      expect(exporter.getFinishedSpans().map(({ name }) => name)).toEqual(['Test.span']);
    } finally {
      trace.disable();
    }
  });
});
