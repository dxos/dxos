//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import * as Tracer from 'effect/Tracer';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import * as Telemetry from 'effect/unstable/ai/Telemetry';

import { makeTracer } from '@dxos/effect';

import * as AiTelemetry from './AiTelemetry';

const stubModel = LanguageModel.make({
  generateText: () =>
    Effect.succeed([
      { type: 'text', text: 'hello' },
      { type: 'finish', reason: 'stop', usage: { inputTokens: { total: 3 }, outputTokens: { total: 5 } } },
    ]),
  streamText: () => Stream.empty,
});

describe('AiTelemetry', () => {
  it.effect('stamps prompt and response content onto the model-call span', () =>
    Effect.gen(function* () {
      const { exporter, provider, layer } = setup();
      yield* LanguageModel.generateText({ prompt: 'hi' }).pipe(Effect.provide(layer));
      yield* Effect.promise(() => provider.forceFlush());

      const span = modelSpan(exporter);
      expect(JSON.parse(String(span.attributes['dxos.ai.input']))).toEqual([
        { role: 'user', content: [{ type: 'text', text: 'hi' }] },
      ]);
      expect(JSON.parse(String(span.attributes['dxos.ai.output']))).toEqual([
        { role: 'assistant', content: [{ type: 'text', text: 'hello' }] },
      ]);
    }),
  );

  it.effect('truncates oversized content rather than dropping it', () =>
    Effect.gen(function* () {
      const { exporter, provider, layer } = setup({ maxContentLength: 32 });
      yield* LanguageModel.generateText({ prompt: 'x'.repeat(500) }).pipe(Effect.provide(layer));
      yield* Effect.promise(() => provider.forceFlush());

      expect(String(modelSpan(exporter).attributes['dxos.ai.input'])).toHaveLength(32);
    }),
  );

  it.effect('leaves the span bare when no transformer is installed', () =>
    Effect.gen(function* () {
      const exporter = new InMemorySpanExporter();
      const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
      yield* LanguageModel.generateText({ prompt: 'hi' }).pipe(
        Effect.provide(Layer.effect(LanguageModel.LanguageModel, stubModel)),
        Effect.provideService(Tracer.Tracer, makeTracer(provider, 'test')),
      );
      yield* Effect.promise(() => provider.forceFlush());

      expect(modelSpan(exporter).attributes['dxos.ai.input']).toBeUndefined();
    }),
  );
});

const setup = (options?: AiTelemetry.ContentTransformerOptions) => {
  const exporter = new InMemorySpanExporter();
  const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
  // Mirrors what the app installs into the process-manager runtime.
  const layer = Layer.mergeAll(
    Layer.effect(LanguageModel.LanguageModel, stubModel),
    Layer.succeed(Tracer.Tracer, makeTracer(provider, 'test')),
    Layer.succeed(Telemetry.CurrentSpanTransformer, AiTelemetry.makeContentSpanTransformer(options)),
  );
  return { exporter, provider, layer };
};

const modelSpan = (exporter: InMemorySpanExporter) => {
  const span = exporter.getFinishedSpans().find(({ name }) => name.startsWith('LanguageModel.'));
  if (!span) {
    throw new Error('model span was not exported');
  }
  return span;
};
