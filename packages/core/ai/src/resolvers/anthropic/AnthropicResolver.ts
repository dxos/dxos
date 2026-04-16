//
// Copyright 2025 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as AnthropicLanguageModel from '@effect/ai-anthropic/AnthropicLanguageModel';
import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as AiModelResolver from '../../AiModelResolver';
import { AiModelNotAvailableError } from '../../errors';

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
        // Default max_tokens so complete answers aren't truncated mid-word.
        // The SDK default is tiny (~500-1024 depending on model), which cuts
        // off demo-scale responses that need to reference multiple tools.
        const max_tokens = 4096;
        switch (model) {
          case '@anthropic/claude-3-5-haiku-20241022':
            return AnthropicLanguageModel.layer({ model: 'claude-3-5-haiku-20241022', config: { max_tokens } }).pipe(
              Layer.provide(clientLayer),
            );
          case '@anthropic/claude-3-5-sonnet-20241022':
            return AnthropicLanguageModel.layer({ model: 'claude-3-5-sonnet-20241022', config: { max_tokens } }).pipe(
              Layer.provide(clientLayer),
            );
          case '@anthropic/claude-haiku-4-5':
            return AnthropicLanguageModel.layer({ model: 'claude-haiku-4-5', config: { max_tokens } }).pipe(
              Layer.provide(clientLayer),
            );
          case '@anthropic/claude-opus-4-0':
            return AnthropicLanguageModel.layer({ model: 'claude-opus-4-0', config: { thinking, max_tokens } }).pipe(
              Layer.provide(clientLayer),
            );
          case '@anthropic/claude-opus-4-5':
            return AnthropicLanguageModel.layer({ model: 'claude-opus-4-5', config: { thinking, max_tokens } }).pipe(
              Layer.provide(clientLayer),
            );
          case '@anthropic/claude-opus-4-6':
            return AnthropicLanguageModel.layer({ model: 'claude-opus-4-6', config: { thinking, max_tokens } }).pipe(
              Layer.provide(clientLayer),
            );
          case '@anthropic/claude-sonnet-4-0':
            return AnthropicLanguageModel.layer({ model: 'claude-sonnet-4-0', config: { max_tokens } }).pipe(
              Layer.provide(clientLayer),
            );
          case '@anthropic/claude-sonnet-4-5':
            return AnthropicLanguageModel.layer({ model: 'claude-sonnet-4-5', config: { max_tokens } }).pipe(
              Layer.provide(clientLayer),
            );
          default:
            return Layer.fail(new AiModelNotAvailableError(model));
        }
      };
    }),
  );
