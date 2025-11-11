//
// Copyright 2025 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as AnthropicLanguageModel from '@effect/ai-anthropic/AnthropicLanguageModel';
import * as OpenAiClient from '@effect/ai-openai/OpenAiClient';
import * as OpenAiLanguageModel from '@effect/ai-openai/OpenAiLanguageModel';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as AiService from './AiService';
import { AiModelResolver, DEFAULT_LMSTUDIO_ENDPOINT } from './AiServiceRouter';
import { AiModelNotAvailableError } from './errors';

const TestRouter = AiModelResolver.buildAiService.pipe(
  Layer.provide(
    AiModelResolver.resolver(
      Effect.gen(function* () {
        const claudeSonnet = yield* AnthropicLanguageModel.model('claude-4-5-sonnet');
        return (name) => {
          switch (name) {
            case '@anthropic/claude-sonnet-4-5':
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
        const gemma = yield* OpenAiLanguageModel.model('google/gemma-3-27b').pipe(
          Effect.provide(
            OpenAiClient.layer({
              apiUrl: DEFAULT_LMSTUDIO_ENDPOINT,
            }),
          ),
        );

        return (name) => {
          switch (name) {
            case '@google/gemma-3-27b':
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
        const model = yield* LanguageModel.LanguageModel;
        expect(model).toBeDefined();
      },
      Effect.provide(AiService.model('@anthropic/claude-sonnet-4-5').pipe(Layer.provide(TestRouter))),
    ),
  );

  it.effect(
    'gemini',
    Effect.fn(
      function* () {
        const model = yield* LanguageModel.LanguageModel;
        expect(model).toBeDefined();
      },
      Effect.provide(AiService.model('@google/gemma-3-27b').pipe(Layer.provide(TestRouter))),
    ),
  );
});
