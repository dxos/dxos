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
  /** Provider NSID name to resolve through. */
  readonly provider?: string;
};

export interface Service {
  /**
   * Service metadata.
   */
  readonly metadata?: ServiceMetadata;

  /**
   * Maps a model NSID name onto a LanguageModel layer.
   */
  readonly model: (
    model: string,
    options?: ResolveOptions,
  ) => Layer.Layer<LanguageModel.LanguageModel, AiModelNotAvailableError, never>;
}

/**
 * AI Model Factory.
 */
export class AiService extends Context.Tag('@dxos/ai/AiService')<AiService, Service>() {}

/**
 * Resolves a model layer by its NSID name — validated at compile time like {@link DXN.make}, so call
 * sites pass the literal id directly.
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
    Effect.map((_) => _.model(model, options)),
    Layer.unwrapEffect,
  );

export const notAvailable = Layer.succeed(AiService, {
  model: (model) => Layer.fail(new AiModelNotAvailableError(model)),
});
