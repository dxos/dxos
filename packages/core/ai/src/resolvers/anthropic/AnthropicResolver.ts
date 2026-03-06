//
// Copyright 2025 DXOS.org
//

import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as AnthropicLanguageModel from '@effect/ai-anthropic/AnthropicLanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as AiModelResolver from '../../AiModelResolver';
import { type ModelName } from '../../defs';
import { AiModelNotAvailableError } from '../../errors';
import { AnthropicClient } from '@effect/ai-anthropic';

export const make = () =>
  AiModelResolver.AiModelResolver.resolver(
    {
      name: 'Anthropic',
    },

    Effect.gen(function* () {
      const clientLayer = Layer.succeed(AnthropicClient.AnthropicClient, yield* AnthropicClient.AnthropicClient);
      return (model, options): Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never> => {
        const thinkingEnabled = options?.thinking ?? true;
        const thinking = thinkingEnabled
          ? ({
              // TODO(dmaretskyi): Switch to adaptive thinking.
              budget_tokens: 1024,
              type: 'enabled',
            } as const)
          : undefined;
        switch (model) {
          case '@anthropic/claude-3-5-haiku-latest':
            return AnthropicLanguageModel.layer({ model: 'claude-3-5-haiku-latest' }).pipe(Layer.provide(clientLayer));
          case '@anthropic/claude-3-5-haiku-20241022':
            return AnthropicLanguageModel.layer({ model: 'claude-3-5-haiku-20241022' }).pipe(
              Layer.provide(clientLayer),
            );
          case '@anthropic/claude-3-5-sonnet-20241022':
            return AnthropicLanguageModel.layer({ model: 'claude-3-5-sonnet-20241022' }).pipe(
              Layer.provide(clientLayer),
            );
          case '@anthropic/claude-haiku-4-5':
            return AnthropicLanguageModel.layer({ model: 'claude-haiku-4-5' }).pipe(Layer.provide(clientLayer));
          case '@anthropic/claude-opus-4-0':
            return AnthropicLanguageModel.layer({ model: 'claude-opus-4-0', config: { thinking } }).pipe(
              Layer.provide(clientLayer),
            );
          case '@anthropic/claude-opus-4-5':
            return AnthropicLanguageModel.layer({ model: 'claude-opus-4-5', config: { thinking } }).pipe(
              Layer.provide(clientLayer),
            );
          case '@anthropic/claude-opus-4-6':
            return AnthropicLanguageModel.layer({ model: 'claude-opus-4-6', config: { thinking } }).pipe(
              Layer.provide(clientLayer),
            );
          case '@anthropic/claude-sonnet-4-0':
            return AnthropicLanguageModel.layer({ model: 'claude-sonnet-4-0' }).pipe(Layer.provide(clientLayer));
          case '@anthropic/claude-sonnet-4-5':
            return AnthropicLanguageModel.layer({ model: 'claude-sonnet-4-5' }).pipe(Layer.provide(clientLayer));
          default:
            return Layer.fail(new AiModelNotAvailableError(model));
        }
      };
    }),
  );
