//
// Copyright 2025 DXOS.org
//

import * as OpenAiLanguageModel from '@effect/ai-openai/OpenAiLanguageModel';
import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';

import * as AiModelResolver from '../../AiModelResolver';
import { type ModelName, modelsBySource } from '../../defs';
import { type AiModelNotAvailableError } from '../../errors';

export const make = () =>
  AiModelResolver.AiModelResolver.fromModelMap(
    {
      name: 'OpenAI',
    },
    Effect.gen(function* () {
      // Derive the id → model-layer map from the catalog's `openai` models (id → back-end name).
      const modelMap: Partial<
        Record<ModelName, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>
      > = {};
      for (const model of modelsBySource('openai')) {
        modelMap[model.id] = yield* OpenAiLanguageModel.model(model.backend);
      }
      return modelMap;
    }),
  );
