//
// Copyright 2025 DXOS.org
//

import { AiLanguageModel } from '@effect/ai';
import { AnthropicLanguageModel, AnthropicClient } from '@effect/ai-anthropic';
import { OpenAiClient, OpenAiLanguageModel } from '@effect/ai-openai';
import { FetchHttpClient } from '@effect/platform';
import { describe, expect, it } from '@effect/vitest';
import { Effect, Layer } from 'effect';

import { AiModelResolver, LMSTUDIO_ENDPOINT } from './AiServiceRouter';
import { AiService } from './deprecated/service';
import { AiModelNotAvailableError } from './errors';

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
              apiUrl: LMSTUDIO_ENDPOINT,
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
