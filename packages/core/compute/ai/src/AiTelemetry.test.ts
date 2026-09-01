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
import { DXN } from '@dxos/keys';

import * as AiModelResolver from './AiModelResolver';
import * as AiService from './AiService';
import * as AiTelemetry from './AiTelemetry';

const makeStub = (inputTokens: Record<string, number>) =>
  LanguageModel.make({
    generateText: () =>
      Effect.succeed([
        { type: 'text', text: 'hello' },
        { type: 'finish', reason: 'stop', usage: { inputTokens, outputTokens: { total: 5 } } },
      ]),
    streamText: () => Stream.empty,
  });

/** Shaped like Anthropic's: `uncached` is what lands in `gen_ai.usage.input_tokens`. */
const stubModel = makeStub({ uncached: 3, total: 21, cacheRead: 11, cacheWrite: 7 });

/** An OpenAI-compatible endpoint, which reports no cache figures at all. */
const uncachedModel = makeStub({ uncached: 3, total: 3 });

const streamingModel = LanguageModel.make({
  generateText: () => Effect.succeed([]),
  streamText: () =>
    Stream.make(
      { type: 'text-delta' as const, id: '0', delta: 'hello' },
      {
        type: 'finish' as const,
        reason: 'stop' as const,
        usage: { inputTokens: { total: 3 }, outputTokens: { total: 5 } },
      },
    ),
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

      const span = modelSpan(exporter);
      expect(String(span.attributes[AiTelemetry.ATTRIBUTES.input])).toHaveLength(32);
      expect(span.attributes[AiTelemetry.ATTRIBUTES.truncated]).toEqual(true);
    }),
  );

  it.effect('marks nothing truncated when everything fits', () =>
    Effect.gen(function* () {
      const { exporter, provider, layer } = setup();
      yield* LanguageModel.generateText({ prompt: 'hi' }).pipe(Effect.provide(layer));
      yield* Effect.promise(() => provider.forceFlush());

      expect(modelSpan(exporter).attributes[AiTelemetry.ATTRIBUTES.truncated]).toBeUndefined();
    }),
  );

  it.effect('drops only the attribute it cannot serialize, leaving the model call intact', () =>
    Effect.gen(function* () {
      const { exporter, provider, layer } = setup();
      // Tool results are arbitrary values; a cycle throws from `JSON.stringify`. Reaching the model
      // span at all proves the throw did not escape onto the call's own fiber.
      const cyclic: Record<string, unknown> = {};
      cyclic.self = cyclic;
      const prompt = [
        {
          role: 'tool' as const,
          content: [{ type: 'tool-result' as const, id: 't1', name: 'search', result: cyclic, isFailure: false }],
        },
      ];
      yield* LanguageModel.generateText({ prompt }).pipe(Effect.provide(layer));
      yield* Effect.promise(() => provider.forceFlush());

      const span = modelSpan(exporter);
      expect(span.attributes[AiTelemetry.ATTRIBUTES.input]).toBeUndefined();
      expect(span.attributes[AiTelemetry.ATTRIBUTES.output]).toBeDefined();
    }),
  );

  it.effect('rides along with a resolved model, so no caller has to install it', () =>
    Effect.gen(function* () {
      // What makes AI capture need no wiring of its own: whoever holds the model holds the hook.
      const transformer = yield* Effect.serviceOption(Telemetry.CurrentSpanTransformer);
      expect(transformer._tag).toEqual('Some');
    }).pipe(
      Effect.provide(
        AiService.model(DXN.getName(DXN.make('example.com.model.stub'))).pipe(
          Layer.provide(
            AiModelResolver.buildAiService.pipe(
              Layer.provide(
                AiModelResolver.resolver(
                  { name: 'stub' },
                  Effect.succeed(() => Layer.effect(LanguageModel.LanguageModel, stubModel)),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );

  it.effect("ends a streamed call's span with its own scope, not the caller's", () =>
    Effect.gen(function* () {
      const { exporter, provider, layer } = setup({}, streamingModel);

      // `streamText` opens its span with `makeSpanScoped`, so it ends when the enclosing scope does.
      // Consuming the stream under `Effect.scoped` is what makes that the turn rather than whatever
      // outlives it — a conversation, in the app. The outer scope here stands in for that: it is
      // still open at the assertion, and the span must already have been exported anyway.
      yield* Effect.scoped(Stream.runCollect(LanguageModel.streamText({ prompt: 'hi' }))).pipe(Effect.provide(layer));
      yield* Effect.promise(() => provider.forceFlush());

      expect(modelSpan(exporter).name).toEqual('LanguageModel.streamText');
    }).pipe(Effect.scoped),
  );

  it('names the attributes the sink reads', () => {
    // `AiSpanProcessor` in `@dxos/observability` restates these; it cannot import them (telemetry
    // sits below the AI stack). Pinning the values here makes a rename fail rather than silently
    // disconnect capture.
    expect(AiTelemetry.ATTRIBUTES).toEqual({
      sessionId: 'dxos.ai.session_id',
      spaceId: 'dxos.ai.space_id',
      input: 'dxos.ai.input',
      output: 'dxos.ai.output',
      tools: 'dxos.ai.tools',
      truncated: 'dxos.ai.truncated',
      cacheReadTokens: 'dxos.ai.cache_read_tokens',
      cacheWriteTokens: 'dxos.ai.cache_write_tokens',
    });
  });

  it.effect('stamps the prompt-cache counts the GenAI conventions have no room for', () =>
    Effect.gen(function* () {
      const { exporter, provider, layer } = setup();
      yield* LanguageModel.generateText({ prompt: 'hi' }).pipe(Effect.provide(layer));
      yield* Effect.promise(() => provider.forceFlush());

      const span = modelSpan(exporter);
      expect(span.attributes[AiTelemetry.ATTRIBUTES.cacheReadTokens]).toEqual(11);
      expect(span.attributes[AiTelemetry.ATTRIBUTES.cacheWriteTokens]).toEqual(7);
    }),
  );

  it.effect('stamps nothing when the provider reports no cache counts', () =>
    Effect.gen(function* () {
      const { exporter, provider, layer } = setup({}, uncachedModel);
      yield* LanguageModel.generateText({ prompt: 'hi' }).pipe(Effect.provide(layer));
      yield* Effect.promise(() => provider.forceFlush());

      // Absent rather than zero, so a consumer can tell "no cache" from "provider does not report".
      const span = modelSpan(exporter);
      expect(span.attributes[AiTelemetry.ATTRIBUTES.cacheReadTokens]).toBeUndefined();
      expect(span.attributes[AiTelemetry.ATTRIBUTES.cacheWriteTokens]).toBeUndefined();
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

const setup = (options?: AiTelemetry.SpanTransformerOptions, model = stubModel) => {
  const exporter = new InMemorySpanExporter();
  const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
  // Mirrors what the app installs into the process-manager runtime.
  const layer = Layer.mergeAll(
    Layer.effect(LanguageModel.LanguageModel, model),
    Layer.succeed(Tracer.Tracer, makeTracer(provider, 'test')),
    Layer.succeed(Telemetry.CurrentSpanTransformer, AiTelemetry.makeSpanTransformer(options)),
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
