//
// Copyright 2025 DXOS.org
//

import * as OpenAiLanguageModel from '@effect/ai-openai/OpenAiLanguageModel';
import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';

import * as AiModelResolver from '../../AiModelResolver';
import { type ModelName } from '../../defs';
import { type AiModelNotAvailableError } from '../../errors';

export const make = () =>
  AiModelResolver.AiModelResolver.fromModelMap(
    {
      name: 'OpenAI',
    },
    Effect.gen(function* () {
      return {
        'ai.openai.model.gpt-4o': yield* OpenAiLanguageModel.model('gpt-4o'),
        'ai.openai.model.gpt-4o-mini': yield* OpenAiLanguageModel.model('gpt-4o-mini'),
        'ai.openai.model.o1': yield* OpenAiLanguageModel.model('o1'),
        'ai.openai.model.o3': yield* OpenAiLanguageModel.model('o3'),
        'ai.openai.model.o3-mini': yield* OpenAiLanguageModel.model('o3-mini'),
      } satisfies Partial<Record<ModelName, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>>;
    }),
  );
