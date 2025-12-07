//
// Copyright 2025 DXOS.org
//

import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as OpenAiLanguageModel from '@effect/ai-openai/OpenAiLanguageModel';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';

import * as AiModelResolver from '../../AiModelResolver';
import { type ModelName } from '../../defs';
import { type AiModelNotAvailableError } from '../../errors';

export const make = () =>
  AiModelResolver.AiModelResolver.fromModelMap(
    'OpenAI',
    Effect.gen(function* () {
      return {
        '@openai/gpt-4o': yield* OpenAiLanguageModel.model('gpt-4o'),
        '@openai/gpt-4o-mini': yield* OpenAiLanguageModel.model('gpt-4o-mini'),
        '@openai/o1': yield* OpenAiLanguageModel.model('o1'),
        '@openai/o3': yield* OpenAiLanguageModel.model('o3'),
        '@openai/o3-mini': yield* OpenAiLanguageModel.model('o3-mini'),
      } satisfies Partial<Record<ModelName, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>>;
    }),
  );
