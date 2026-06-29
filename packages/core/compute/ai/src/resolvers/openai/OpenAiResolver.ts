//
// Copyright 2025 DXOS.org
//

import * as OpenAiLanguageModel from '@effect/ai-openai/OpenAiLanguageModel';
import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';

import { DXN } from '@dxos/keys';

import * as AiModelResolver from '../../AiModelResolver';
import * as Model from '../../Model';
import * as Provider from '../../Provider';
import { type AiModelNotAvailableError } from '../../errors';

export const make = () =>
  AiModelResolver.AiModelResolver.fromModelMap(
    {
      name: 'OpenAI',
    },
    Provider.openai.id,
    Effect.gen(function* () {
      // Derive the id → model-layer map from the OpenAI provider's catalog models (id → back-end name).
      const modelMap: Partial<
        Record<DXN.DXN, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>
      > = {};
      for (const model of Model.forProvider(Provider.openai.id)) {
        modelMap[model.id] = yield* OpenAiLanguageModel.model(model.backend);
      }
      return modelMap;
    }),
  );
