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
 * Resolves a model layer by id. Accepts a model DXN or a bare NSID name — validated at compile time
 * like {@link DXN.make} — so call sites can pass the literal id without wrapping it in `DXN.make`.
 */
export const model: {
  <Id extends string>(
    model:
      | DXN.DXN
      | ([DXN.Name<Id>] extends [never] ? `Invalid NSID "${Id}": final segment must be camelCase (no hyphens)` : Id),
    options?: ResolveOptions,
  ): Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, AiService>;
} = (
  model: DXN.DXN | string,
  options?: ResolveOptions,
): Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, AiService> => {
  const dxn = DXN.isDXN(model) ? model : DXN.make(model);
  return AiService.pipe(
    Effect.map((_) => _.model(dxn, options)),
    Layer.unwrapEffect,
  );
};

export const notAvailable = Layer.succeed(AiService, {
  model: (model) => Layer.fail(new AiModelNotAvailableError(model)),
});
