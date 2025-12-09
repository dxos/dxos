//
// Copyright 2025 DXOS.org
//

import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { type ModelName } from './defs';
import { AiModelNotAvailableError } from './errors';

export type SericeMetadata = {
  name: string;
};

export interface Service {
  /**
   * Service metadata.
   */
  readonly metadata?: SericeMetadata;

  /**
   * Maps model name ont a LanguageModel layer.
   */
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
