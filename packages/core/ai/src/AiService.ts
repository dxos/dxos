//
// Copyright 2025 DXOS.org
//

import { type LanguageModel } from '@effect/ai';
import { Context, Effect, Layer } from 'effect';

import { AiModelNotAvailableError } from './errors';
import { type ModelName } from './model';

export interface Service {
  readonly model: (model: ModelName) => Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>;
}

/**
 * AI Model Factory.
 */
export class AiService extends Context.Tag('@dxos/ai/AiService')<AiService, Service>() {}

export const model: (
  model: ModelName,
) => Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, AiService> = (model) =>
  AiService.pipe(
    Effect.map((_) => _.model(model)),
    Layer.unwrapEffect,
  );

export const notAvailable = Layer.succeed(AiService, {
  model: (model) => Layer.fail(new AiModelNotAvailableError(model)),
});
