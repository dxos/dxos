//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { AiModelResolver, AiService, AiUsage, Model } from '@dxos/ai';

import * as AiMetering from './AiMetering.ts';
import * as Trace from './Trace.ts';

const HAIKU = 'com.anthropic.model.claude-haiku-5-5.default';

const stub = LanguageModel.make({
  generateText: () =>
    Effect.succeed([
      { type: 'text', text: 'ok' },
      {
        type: 'finish',
        reason: 'stop',
        usage: { inputTokens: { uncached: 1_000, total: 1_000 }, outputTokens: { total: 200 } },
      },
    ]),
  streamText: () => Stream.empty,
});

const upstream = AiModelResolver.buildAiService.pipe(
  Layer.provide(
    AiModelResolver.resolver(
      { name: 'stub' },
      Effect.succeed(() => Layer.effect(LanguageModel.LanguageModel, stub)),
    ),
  ),
);

/** The metered service over the stub, with every trace message it writes collected into `messages`. */
const setup = () => {
  const messages: Trace.Message[] = [];
  const trace = Trace.testTraceService().pipe(
    Layer.provide(Layer.succeed(Trace.TraceSink, { write: (message) => messages.push(message) })),
  );
  return { messages, layer: AiMetering.metered.pipe(Layer.provide(Layer.merge(upstream, trace))) };
};

const call = LanguageModel.generateText({ prompt: 'hi' }).pipe(Effect.provide(AiService.languageModel(HAIKU)));

describe('AiMetering', () => {
  it.effect('writes a model-call event per call, attributed to the caller stage and thread', () =>
    Effect.gen(function* () {
      const { messages, layer } = setup();
      yield* call.pipe(
        AiUsage.withStage('extract-facts'),
        Effect.provideService(Trace.CurrentThread, 'thread-1'),
        Effect.provide(layer),
      );

      expect(messages).toHaveLength(1);
      expect(messages[0].meta.thread).toEqual('thread-1');
      const [event] = messages.flatMap(Trace.flatten);
      expect(Trace.isOfType(Trace.ModelCall, event)).toBe(true);
      expect(event.data).toMatchObject({
        modelId: Model.claudeHaiku55.id.toString(),
        model: 'claude-haiku-5-5',
        stage: 'extract-facts',
        inputTokens: 1_000,
        outputTokens: 200,
      });
    }),
  );

  it.effect('totals calls per model and stage, priced from the catalog', () =>
    Effect.gen(function* () {
      const { messages, layer } = setup();
      yield* Effect.all([call, call], { concurrency: 'unbounded' }).pipe(
        AiUsage.withStage('topics'),
        Effect.provide(layer),
      );

      const [total] = AiMetering.summarize(messages.flatMap(Trace.flatten));
      expect(total).toMatchObject({ model: 'claude-haiku-5-5', stage: 'topics', calls: 2, inputTokens: 2_000 });
      // 2,000 input at $0.10/M plus 400 output at $0.50/M.
      expect(total.cost).toBeCloseTo(0.0004, 10);
    }),
  );
});
