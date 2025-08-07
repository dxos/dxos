//
// Copyright 2025 DXOS.org
//

import { type AiLanguageModel } from '@effect/ai';
import { Context, Effect, Layer } from 'effect';

import { AiModelNotAvailableError } from './errors';
import { type ModelName } from './model';

/**
 * AI Model Factory.
 */
export class AiService extends Context.Tag('@dxos/ai/AiService')<
  AiService,
  {
    readonly model: (model: ModelName) => Layer.Layer<AiLanguageModel.AiLanguageModel, AiModelNotAvailableError, never>;
  }
>() {}

export const model: (
  model: ModelName,
) => Layer.Layer<AiLanguageModel.AiLanguageModel, AiModelNotAvailableError, AiService> = (model) =>
  AiService.pipe(
    Effect.map((_) => _.model(model)),
    Layer.unwrapEffect,
  );

export const notAvailable = Layer.succeed(AiService, {
  model: (model) => Layer.fail(new AiModelNotAvailableError(model)),
});
