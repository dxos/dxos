//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as LanguageModel from 'effect/unstable/ai/LanguageModel';

import { DXN } from '@dxos/keys';

import { AiModelNotAvailableError } from './errors.ts';
import * as Model from './Model.ts';

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
export class AiService extends Context.Service<AiService, Service>()('@dxos/ai/AiService') {}

/**
 * Module-level alias for the tag itself (usable as `Effect<Service, never, AiService>`) so
 * callers importing the namespace avoid the doubled `AiService.AiService`.
 */
export const tag: Effect.Effect<Service, never, AiService> = AiService;

/** Module-level alias for the tag's own `key`, so callers avoid the doubled `AiService.AiService.key`. */
export const key = AiService.key;

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
    Layer.unwrap,
  );

export const notAvailable = Layer.succeed(AiService, {
  model: (model) => Layer.unwrap(Effect.fail(new AiModelNotAvailableError(model))),
});
