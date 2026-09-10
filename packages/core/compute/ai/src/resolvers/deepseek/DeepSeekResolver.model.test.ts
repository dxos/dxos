//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import { TestHelpers } from '@dxos/effect/testing';

import * as AiParser from '../../AiParser';
import * as AiService from '../../AiService';
import { TestAiService } from '../../testing/test-layers';

const FLASH = 'com.deepseek.model.deepseek-v4-flash.default';

/**
 * Two single-city tools rather than one multi-city tool, so the only way to answer about both
 * cities in one turn is two tool calls — which is what the OpenAI dialect streams as indexed
 * argument deltas with no per-call terminator, and what the adapter used to leave unterminated
 * until the end of the stream.
 */
const WeatherToolkit = Toolkit.make(
  Tool.make('WeatherInLondon', {
    description: 'Current temperature in London, in celsius.',
    parameters: Schema.Struct({ unit: Schema.Literals(['celsius', 'fahrenheit']) }),
    success: Schema.Struct({ celsius: Schema.Number }),
    failure: Schema.Never,
  }),
  Tool.make('WeatherInParis', {
    description: 'Current temperature in Paris, in celsius.',
    parameters: Schema.Struct({ unit: Schema.Literals(['celsius', 'fahrenheit']) }),
    success: Schema.Struct({ celsius: Schema.Number }),
    failure: Schema.Never,
  }),
);

const WeatherLayer = WeatherToolkit.toLayer({
  WeatherInLondon: Effect.fn(function* () {
    return { celsius: 11 };
  }),
  WeatherInParis: Effect.fn(function* () {
    return { celsius: 14 };
  }),
});

const TestLayer = AiService.model(FLASH).pipe(Layer.provide(TestAiService({ preset: 'deepseek' })));

/**
 * Replays a recorded DeepSeek turn that calls two tools at once — the shape that crashed the parser
 * with `invariant violation [!block]`, because DeepSeek speaks the OpenAI dialect and the adapter
 * deferred every `tool-params-end` to the end of the stream.
 *
 * Recording needs a live DeepSeek key, which the default CI does not have, hence the extra `manual`
 * tag. To record (and then drop `manual` from the tags):
 *
 * ```bash
 * DX_RUN_MANUAL_TESTS=1 DX_UPDATE_MODEL_FIXTURES=1 DEEPSEEK_API_KEY=... \
 *   moon run ai:test -- src/resolvers/deepseek/DeepSeekResolver.model.test.ts
 * ```
 */
describe('DeepSeek parallel tool calls', { tags: ['model-fixture', 'manual'] }, () => {
  it.effect(
    'closes each streamed tool call before opening the next',
    Effect.fnUntraced(
      function* ({ expect }) {
        const parts = yield* LanguageModel.streamText({
          toolkit: WeatherToolkit,
          prompt: 'How warm is it in London and in Paris right now? Call both tools at once, in celsius.',
        }).pipe(Stream.runCollect);

        const params = parts
          .filter((part) => part.type.startsWith('tool-params-'))
          .map((part) => [part.type, (part as { id: string }).id] as const);
        expect(params.length).toBeGreaterThanOrEqual(6);

        // Every call is opened, filled and closed before the next one opens; a start arriving while
        // another call is open is exactly the crash this fixture guards.
        const open = new Set<string>();
        for (const [type, id] of params) {
          switch (type) {
            case 'tool-params-start': {
              expect(open.size, `tool call ${id} opened while ${[...open]} was still open`).toBe(0);
              open.add(id);
              break;
            }
            case 'tool-params-delta': {
              expect(open.has(id)).toBe(true);
              break;
            }
            case 'tool-params-end': {
              expect(open.delete(id)).toBe(true);
              break;
            }
          }
        }
        expect(open.size).toBe(0);
      },
      Effect.provide(WeatherLayer),
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 120_000 },
  );

  it.effect(
    'the parser turns the same turn into one block per tool call',
    Effect.fnUntraced(
      function* ({ expect }) {
        const blocks = yield* LanguageModel.streamText({
          toolkit: WeatherToolkit,
          prompt: 'How warm is it in London and in Paris right now? Call both tools at once, in celsius.',
        }).pipe(AiParser.parseResponse(), Stream.runCollect);

        const toolCalls = blocks.filter((block) => block._tag === 'toolCall');
        expect(toolCalls.map((block) => block.name).sort()).toEqual(['WeatherInLondon', 'WeatherInParis']);
        // Truncated input is how a call that was never closed used to surface downstream.
        for (const call of toolCalls) {
          expect(() => JSON.parse(call.input)).not.toThrow();
        }
      },
      Effect.provide(WeatherLayer),
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
    { timeout: 120_000 },
  );
});
