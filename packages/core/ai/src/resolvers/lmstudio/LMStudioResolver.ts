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

/**
 * curl http://localhost:1234/v1/models | jq
 */
export const DEFAULT_LMSTUDIO_ENDPOINT = 'http://localhost:1234';

export const make = ({
  endpoint = DEFAULT_LMSTUDIO_ENDPOINT,
}: {
  endpoint?: string;
} = {}) =>
  AiModelResolver.AiModelResolver.fromModelMap(
    Effect.gen(function* () {
      return {
        '@google/gemma-3-27b': yield* OpenAiLanguageModel.model('google/gemma-3-27b'),
        '@meta/llama-3.1-8b-instruct': yield* OpenAiLanguageModel.model('meta-llama-3.1-8b-instruct'),
        '@meta/llama-3.2-3b-instruct': yield* OpenAiLanguageModel.model('llama-3.2-3b-instruct'),
        'ministral-3-14b-reasoning': yield* OpenAiLanguageModel.model('ministral-3-14b-reasoning'),
        'openai/gpt-oss-20b': yield* OpenAiLanguageModel.model('openai/gpt-oss-20b'),
      } satisfies Partial<Record<ModelName, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>>;
    }).pipe(
      Effect.provide(
        OpenAiClient.layer({
          apiUrl: new URL('/v1', endpoint).toString(),
        }),
      ),
    ),
  );
