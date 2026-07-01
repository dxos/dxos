//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as LanguageModel from '@effect/ai/LanguageModel';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { DXN } from '@dxos/keys';

import { AiModelNotAvailableError } from './errors';
import * as Model from './Model';

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

/**
 * Resolves a model layer from a bare NSID name — validated at compile time like {@link DXN.make} and
 * constructed to a model DXN internally. Call sites pass the literal id; a value already held as a
 * `DXN.DXN` is resolved via the service's {@link Service.model} (or `DXN.getName` for the helper).
 */
export const model: {
  <Id extends string>(
    model: [DXN.Name<Id>] extends [never] ? `Invalid NSID "${Id}": final segment must be camelCase (no hyphens)` : Id,
    options?: ResolveOptions,
  ): Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, AiService>;
} = (
  model: string,
  options?: ResolveOptions,
): Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, AiService> =>
  AiService.pipe(
    Effect.map((_) => _.model(DXN.make(model), options)),
    Layer.unwrapEffect,
  );

export const notAvailable = Layer.succeed(AiService, {
  model: (model) => Layer.fail(new AiModelNotAvailableError(model)),
});
