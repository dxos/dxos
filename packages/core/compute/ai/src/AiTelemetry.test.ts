//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import * as Telemetry from 'effect/unstable/ai/Telemetry';

import { makeTracer } from '@dxos/effect';
import { DXN } from '@dxos/keys';

import * as AiService from './AiService';
import * as AiTelemetry from './AiTelemetry';

const MODEL = DXN.make('com.example.model.stub');

const makeStubModel = LanguageModel.make({
  generateText: (options) =>
    Effect.sync(() => {
      Telemetry.addGenAIAnnotations(options.span, {
        system: 'stub',
        request: { model: 'stub-model' },
        usage: { inputTokens: 3, outputTokens: 5 },
      });
      return [
        { type: 'text', text: 'hello' },
        { type: 'finish', reason: 'stop', usage: { inputTokens: { total: 3 }, outputTokens: { total: 5 } } },
      ];
    }),
  streamText: () => Stream.empty,
});

const setup = Effect.fnUntraced(function* (options: Omit<AiTelemetry.WrapOptions, 'tracer'>) {
  const exporter = new InMemorySpanExporter();
  const provider = new BasicTracerProvider({ spanProcessors: [new SimpleSpanProcessor(exporter)] });
  const languageModel = yield* makeStubModel;
  const service: AiService.Service = {
    model: () => Layer.succeed(LanguageModel.LanguageModel, languageModel),
  };
  const wrapped = AiTelemetry.wrap(service, { tracer: makeTracer(provider, 'test'), ...options });
  return { exporter, provider, wrapped };
});

describe('AiTelemetry', () => {
  it.effect('routes model spans to the wrapped tracer with content and session id', () =>
    Effect.gen(function* () {
      const { exporter, provider, wrapped } = yield* setup({
        spanTransformer: AiTelemetry.makeContentSpanTransformer(),
      });

      yield* LanguageModel.generateText({ prompt: 'hi' }).pipe(
        Effect.provide(wrapped.model(MODEL)),
        Effect.withSpan('AiSession.createRequest'),
        Effect.annotateSpans('dxos.ai.session_id', 'feed-1'),
      );
      yield* Effect.promise(() => provider.forceFlush());

      const span = findModelSpan(exporter);
      expect(span.attributes['gen_ai.system']).toEqual('stub');
      expect(span.attributes['gen_ai.request.model']).toEqual('stub-model');
      expect(span.attributes['gen_ai.usage.input_tokens']).toEqual(3);
      expect(span.attributes['gen_ai.usage.output_tokens']).toEqual(5);
      expect(span.attributes['dxos.ai.session_id']).toEqual('feed-1');

      const input = JSON.parse(String(span.attributes['dxos.ai.input']));
      expect(input).toEqual([{ role: 'user', content: [{ type: 'text', text: 'hi' }] }]);
      const output = JSON.parse(String(span.attributes['dxos.ai.output']));
      expect(output).toEqual([{ role: 'assistant', content: [{ type: 'text', text: 'hello' }] }]);
    }),
  );

  it.effect('captures metadata only without a content transformer', () =>
    Effect.gen(function* () {
      const { exporter, provider, wrapped } = yield* setup({});

      yield* LanguageModel.generateText({ prompt: 'hi' }).pipe(Effect.provide(wrapped.model(MODEL)));
      yield* Effect.promise(() => provider.forceFlush());

      const span = findModelSpan(exporter);
      expect(span.attributes['gen_ai.usage.input_tokens']).toEqual(3);
      expect(span.attributes['dxos.ai.input']).toBeUndefined();
      expect(span.attributes['dxos.ai.output']).toBeUndefined();
    }),
  );
});

const findModelSpan = (exporter: InMemorySpanExporter) => {
  const span = exporter.getFinishedSpans().find(({ name }) => name === 'LanguageModel.generateText');
  if (!span) {
    throw new Error('model span was not exported');
  }
  return span;
};
