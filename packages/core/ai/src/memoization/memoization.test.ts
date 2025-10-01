//
// Copyright 2025 DXOS.org
//

import { Chat, LanguageModel, Prompt } from '@effect/ai';
import { describe, expect, it } from '@effect/vitest';
import { Effect, Layer, Stream } from 'effect';

import * as AiService from '../AiService';
import { AiServiceTestingPreset, TestingToolkit, testingLayer } from '../testing';

import * as MemoizedAiService from './MemoizedAiService';

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
      function* (ctx) {
        const result = yield* LanguageModel.generateText({
          prompt: 'Write me a long poem!',
        });
        console.log(result);
      },
      Effect.provide(AiService.model('@anthropic/claude-sonnet-4-0')),
      MemoizedAiService.injectIntoTest(),
      Effect.provide(AiServiceTestingPreset('direct')),
    ),
  );

  it.effect(
    'tools',
    Effect.fnUntraced(
      function* (ctx) {
        const chat = yield* Chat.fromPrompt('Add 47 + 23');

        while (true) {
          const stream = chat.streamText({
            prompt: Prompt.empty,
            toolkit: TestingToolkit,
          });
          yield* stream.pipe(
            Stream.runForEach((part) => {
              console.log(part);
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
      Effect.provide(Layer.merge(AiService.model('@anthropic/claude-sonnet-4-0'), testingLayer)),
      MemoizedAiService.injectIntoTest(), // <--- magic here.
      Effect.provide(AiServiceTestingPreset('direct')),
    ),
  );
});
