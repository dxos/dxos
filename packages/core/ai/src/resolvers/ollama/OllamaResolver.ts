//
// Copyright 2025 DXOS.org
//

import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as OpenAiClient from '@effect/ai-openai/OpenAiClient';
import * as OpenAiLanguageModel from '@effect/ai-openai/OpenAiLanguageModel';
import type * as HttpClient from '@effect/platform/HttpClient';
import * as Effect from 'effect/Effect';
import type * as Layer from 'effect/Layer';

import * as AiModelResolver from '../../AiModelResolver';
import { type ModelName } from '../../defs';
import { type AiModelNotAvailableError } from '../../errors';

export const DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434';

export const make = ({
  server = DEFAULT_OLLAMA_ENDPOINT,
  transformClient,
}: {
  readonly server?: string;
  readonly transformClient?: (client: HttpClient.HttpClient) => HttpClient.HttpClient;
} = {}) =>
  AiModelResolver.AiModelResolver.fromModelMap(
    Effect.gen(function* () {
      return {
        '@google/gemma-3-27b': yield* OpenAiLanguageModel.model('gemma-3-27b'),
        'deepseek-r1:latest': yield* OpenAiLanguageModel.model('deepseek-r1:latest'),
        'qwen2.5:14b': yield* OpenAiLanguageModel.model('qwen2.5:14b'),
      } satisfies Partial<Record<ModelName, Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>>>;
    }).pipe(
      Effect.provide(
        OpenAiClient.layer({
          apiUrl: server + '/v1',
          transformClient,
        }),
      ),
    ),
  );
