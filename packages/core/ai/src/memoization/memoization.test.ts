import { describe, expect, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';
import * as MemoizedAiService from './MemoizedAiService';
import { AiServiceTestingPreset } from '../testing';
import * as AiService from '../AiService';
import { LanguageModel } from '@effect/ai';

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
      MemoizedAiService.injectIntoTest,
      Effect.provide(AiServiceTestingPreset('direct')),
    ),
  );
});
