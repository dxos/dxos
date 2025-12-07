//
// Copyright 2025 DXOS.org
//

import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as AnthropicLanguageModel from '@effect/ai-anthropic/AnthropicLanguageModel';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';

import * as AiModelResolver from '../../AiModelResolver';
import { type ModelName } from '../../defs';
import { type AiModelNotAvailableError } from '../../errors';

export const make = () =>
  AiModelResolver.AiModelResolver.fromModelMap(
    Effect.gen(function* () {
      return {
        '@anthropic/claude-3-5-haiku-latest': yield* AnthropicLanguageModel.model('claude-3-5-haiku-latest'),
        '@anthropic/claude-3-5-haiku-20241022': yield* AnthropicLanguageModel.model('claude-3-5-haiku-20241022'),
        '@anthropic/claude-3-5-sonnet-20241022': yield* AnthropicLanguageModel.model('claude-3-5-sonnet-20241022'),
        '@anthropic/claude-opus-4-0': yield* AnthropicLanguageModel.model('claude-opus-4-0'),
        '@anthropic/claude-haiku-4-5': yield* AnthropicLanguageModel.model('claude-haiku-4-5'),
        '@anthropic/claude-sonnet-4-0': yield* AnthropicLanguageModel.model('claude-sonnet-4-0'),
        '@anthropic/claude-sonnet-4-5': yield* AnthropicLanguageModel.model('claude-sonnet-4-5'),
      } satisfies Partial<Record<ModelName, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>>;
    }),
  );
