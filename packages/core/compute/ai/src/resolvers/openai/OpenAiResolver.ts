//
// Copyright 2025 DXOS.org
//

import * as OpenAiLanguageModel from '@effect/ai-openai/OpenAiLanguageModel';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';
import type * as LanguageModel from 'effect/unstable/ai/LanguageModel';

import { DXN } from '@dxos/keys';

import * as AiModelResolver from '../../AiModelResolver';
import { type AiModelNotAvailableError } from '../../errors';
import * as Model from '../../Model';
import * as Provider from '../../Provider';

export const make = () =>
  AiModelResolver.fromModelMap(
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
        modelMap[model.id] = yield* OpenAiLanguageModel.model(model.backend).captureRequirements;
      }
      return modelMap;
    }),
  );
