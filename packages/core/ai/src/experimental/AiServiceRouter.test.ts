import { describe, expect, it } from '@effect/vitest';

import { AnthropicLanguageModel } from '@effect/ai-anthropic';
import { OpenAiClient, OpenAiLanguageModel } from '@effect/ai-openai';
import { Config, Effect, Layer } from 'effect';

import { AnthropicClient } from '@effect/ai-anthropic';
import { AiModelNotAvailableError } from '../errors';
import { AiService } from '../service';
import { AiModelResolver } from './AiServiceRouter';
import { FetchHttpClient } from '@effect/platform';
import { AiLanguageModel } from '@effect/ai';

const TestRouter = AiModelResolver.buildAiService.pipe(
  Layer.provide(
    AiModelResolver.resolver(
      Effect.gen(function* () {
        const claudeSonnet = yield* AnthropicLanguageModel.model('claude-3-5-sonnet-20241022');
        return (name) => {
          switch (name) {
            case '@anthropic/claude-3-5-sonnet-20241022':
              return claudeSonnet;
            default:
              return Layer.fail(new AiModelNotAvailableError(name));
          }
        };
      }),
    ),
  ),
  Layer.provide(
    AiModelResolver.resolver(
      Effect.gen(function* () {
        const gemma = yield* OpenAiLanguageModel.model('google/gemma-3-12b' as any).pipe(
          Effect.provide(
            OpenAiClient.layer({
              apiUrl: 'http://localhost:1234/v1',
            }),
          ),
        );

        return (name) => {
          switch (name) {
            case '@google/gemma-3-12b':
              return gemma;
            default:
              return Layer.fail(new AiModelNotAvailableError(name));
          }
        };
      }),
    ),
  ),
  Layer.provide(AnthropicClient.layer({})),
  Layer.provide(FetchHttpClient.layer),
);

describe('AiServiceRouter', () => {
  it.effect(
    'claude',
    Effect.fn(
      function* () {
        const model = yield* AiLanguageModel.AiLanguageModel;
        expect(model).toBeDefined();
      },
      Effect.provide(AiService.model('@anthropic/claude-3-5-sonnet-20241022').pipe(Layer.provide(TestRouter))),
    ),
  );

  it.effect(
    'gemini',
    Effect.fn(
      function* () {
        const model = yield* AiLanguageModel.AiLanguageModel;
        expect(model).toBeDefined();
      },
      Effect.provide(AiService.model('@google/gemma-3-12b').pipe(Layer.provide(TestRouter))),
    ),
  );
});
