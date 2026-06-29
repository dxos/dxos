//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { DXN } from '@dxos/keys';

import * as Model from './Model';
import { AiModelNotAvailableError } from './errors';

export type ServiceMetadata = {
  name: string;
};

/** Options for resolving a model: the provider to resolve through (defaults to edge) plus model options. */
export type ResolveOptions = Model.Options & {
  readonly provider?: DXN.DXN;
};

export interface Service {
  /**
   * Service metadata.
   */
  readonly metadata?: ServiceMetadata;

  /**
   * Maps model name ont a LanguageModel layer.
   */
  readonly model: (
    model: DXN.DXN,
    options?: ResolveOptions,
  ) => Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>;
}

/**
 * AI Model Factory.
 */
export class AiService extends Context.Tag('@dxos/ai/AiService')<AiService, Service>() {}

export const model: (
  model: DXN.DXN,
  options?: ResolveOptions,
) => Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, AiService> = (model, options) =>
  AiService.pipe(
    Effect.map((_) => _.model(model, options)),
    Layer.unwrapEffect,
  );

export const notAvailable = Layer.succeed(AiService, {
  model: (model) => Layer.fail(new AiModelNotAvailableError(model)),
});
