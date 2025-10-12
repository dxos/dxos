//
// Copyright 2025 DXOS.org
//

import { Chat, LanguageModel, Prompt, Tool, Toolkit } from '@effect/ai';
import * as AnthropicTool from '@effect/ai-anthropic/AnthropicTool';
import { describe, expect, it } from '@effect/vitest';
import { Effect, Layer, Schema, Stream } from 'effect';

import { TestHelpers } from '@dxos/effect';

import * as AiService from '../AiService';
import { AiServiceTestingPreset, TestingToolkit, testingLayer } from '../testing';

import * as MemoizedAiService from './MemoizedAiService';

class DateToolkit extends Toolkit.make(
  Tool.make('get-date', {
    description: 'Get the current date',
    success: Schema.DateFromString,
  }),
) {
  static layerTest = DateToolkit.toLayer({
    'get-date': Effect.fnUntraced(function* () {
      return new Date('2025-10-01');
    }),
  });
}

const TestLayer = Layer.mergeAll(
  testingLayer,
  DateToolkit.layerTest,
  AiService.model('@anthropic/claude-sonnet-4-0'),
).pipe(Layer.provideMerge(MemoizedAiService.layerTest()), Layer.provide(AiServiceTestingPreset('direct')));

describe('memoization', () => {
  it.effect(
    'context paths',
    Effect.fnUntraced(function* (ctx) {
      const filepath = ctx.task.file.filepath;
      expect(filepath.endsWith('memoization.test.ts')).toBe(true);
    }),
  );

  it.effect(
    'generate a poem',
    Effect.fnUntraced(
      function* (_) {
        const result = yield* LanguageModel.generateText({
          prompt: 'Write me a poem!',
        });
        // console.log(result);
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'tools',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* Chat.fromPrompt('Add 47 + 23');

        while (true) {
          const stream = chat.streamText({
            prompt: Prompt.empty,
            toolkit: TestingToolkit,
          });
          yield* stream.pipe(
            Stream.runForEach((part) => {
              // console.log(part);
              return Effect.void;
            }),
          );

          const lastMessage = (yield* chat.history).content.at(-1);
          if (lastMessage?.role === 'tool') {
            continue;
          } else {
            break;
          }
        }
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'tools with encoding',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* Chat.fromPrompt('What is the current date?');

        while (true) {
          const response = yield* chat.generateText({
            prompt: Prompt.empty,
            toolkit: yield* DateToolkit,
          });
          if (response.finishReason === 'tool-calls') {
            continue;
          } else {
            expect(response.finishReason).toBe('stop');
            console.log(response.text);
            break;
          }
        }
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );

  it.effect(
    'provider-defined tool',
    Effect.fnUntraced(
      function* (_) {
        const chat = yield* Chat.fromPrompt('Who is the current pope?');

        while (true) {
          const response = yield* chat.generateText({
            prompt: Prompt.empty,
            toolkit: yield* Toolkit.make(AnthropicTool.WebSearch_20250305({})),
          });
          if (response.finishReason === 'tool-calls') {
            continue;
          } else {
            expect(response.finishReason).toBe('stop');
            console.log(response.text);
            break;
          }
        }
      },
      Effect.provide(TestLayer),
      TestHelpers.provideTestContext,
    ),
  );
});
