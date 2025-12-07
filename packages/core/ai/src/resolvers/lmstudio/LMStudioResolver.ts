//
// Copyright 2025 DXOS.org
//

import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as OpenAiClient from '@effect/ai-openai/OpenAiClient';
import * as OpenAiLanguageModel from '@effect/ai-openai/OpenAiLanguageModel';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';

import * as AiModelResolver from '../../AiModelResolver';
import { type ModelName } from '../../defs';
import { type AiModelNotAvailableError } from '../../errors';

export const DEFAULT_LMSTUDIO_ENDPOINT = 'http://localhost:1234/v1';

export const make = ({
  server = DEFAULT_LMSTUDIO_ENDPOINT,
}: {
  readonly server?: string;
} = {}) =>
  AiModelResolver.AiModelResolver.fromModelMap(
    Effect.gen(function* () {
      return {
        '@google/gemma-3-27b': yield* OpenAiLanguageModel.model('google/gemma-3-27b'),
        '@meta/llama-3.2-3b-instruct': yield* OpenAiLanguageModel.model('llama-3.2-3b-instruct'),
      } satisfies Partial<Record<ModelName, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>>;
    }).pipe(
      Effect.provide(
        OpenAiClient.layer({
          apiUrl: server,
        }),
      ),
    ),
  );
