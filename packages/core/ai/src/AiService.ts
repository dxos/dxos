//
// Copyright 2025 DXOS.org
//

import { type AiLanguageModel } from '@effect/ai';
import { Context, Effect, Layer } from 'effect';

import { type AiModelNotAvailableError } from './errors';
import { type LLMModel } from './types';

/**
 * AI Model Factory.
 */
export class AiService extends Context.Tag('@dxos/ai/AiService')<
  AiService,
  {
    readonly model: (model: LLMModel) => Layer.Layer<AiLanguageModel.AiLanguageModel, AiModelNotAvailableError, never>;
  }
>() {
  static model: (model: LLMModel) => Layer.Layer<AiLanguageModel.AiLanguageModel, AiModelNotAvailableError, AiService> =
    (model) =>
      AiService.pipe(
        Effect.map((_) => _.model(model)),
        Layer.unwrapEffect,
      );
}
