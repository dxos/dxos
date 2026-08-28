//
// Copyright 2025 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as AnthropicLanguageModel from '@effect/ai-anthropic/AnthropicLanguageModel';
import * as OpenAiClient from '@effect/ai-openai/OpenAiClient';
import * as OpenAiLanguageModel from '@effect/ai-openai/OpenAiLanguageModel';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import { DXN } from '@dxos/keys';

import * as AiModelResolver from './AiModelResolver';
import * as AiService from './AiService';
import { AiModelNotAvailableError } from './errors';
import * as LMStudioResolver from './resolvers/lmstudio/LMStudioResolver';

const SONNET = DXN.make('com.anthropic.model.claude-sonnet-4-6.default');
const GEMMA = DXN.make('com.google.model.gemma-3-27b.default');

const TestRouter = AiModelResolver.buildAiService.pipe(
  Layer.provide(
    AiModelResolver.resolver(
      {
        name: 'Anthropic',
      },
      Effect.gen(function* () {
        const claudeSonnet = yield* AnthropicLanguageModel.model('claude-sonnet-4-6').captureRequirements;
        return (name: DXN.DXN) =>
          name === SONNET ? claudeSonnet : Layer.unwrap(Effect.fail(new AiModelNotAvailableError(name)));
      }),
    ),
  ),
  Layer.provide(
    AiModelResolver.resolver(
      {
        name: 'LM Studio',
      },
      Effect.gen(function* () {
        const gemma = yield* OpenAiLanguageModel.model('google/gemma-3-27b').captureRequirements.pipe(
          Effect.provide(
            OpenAiClient.layer({
              apiUrl: LMStudioResolver.DEFAULT_LMSTUDIO_ENDPOINT,
            }),
          ),
        );

        return (name: DXN.DXN) =>
          name === GEMMA ? gemma : Layer.unwrap(Effect.fail(new AiModelNotAvailableError(name)));
      }),
    ),
  ),
  Layer.provide(AnthropicClient.layer({})),
  Layer.provide(FetchHttpClient.layer),
);

describe('AiModelResolver', () => {
  it.effect(
    'claude',
    Effect.fn(
      function* () {
        const model = yield* LanguageModel.LanguageModel;
        expect(model).toBeDefined();
      },
      Effect.provide(AiService.model(DXN.getName(SONNET)).pipe(Layer.provide(TestRouter))),
    ),
  );

  it.effect(
    'gemini',
    Effect.fn(
      function* () {
        const model = yield* LanguageModel.LanguageModel;
        expect(model).toBeDefined();
      },
      Effect.provide(AiService.model(DXN.getName(GEMMA)).pipe(Layer.provide(TestRouter))),
    ),
  );
});
