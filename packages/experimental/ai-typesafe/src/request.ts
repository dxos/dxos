//
// Copyright 2026 DXOS.org
//

import { type CapabilityOf, type IdOf, type Model } from './model.ts';

/** Options a model accepts, keyed off the capabilities it declares. */
export type Options<M extends Model> = {
  readonly maxTokens?: number;
} & ('thinking' extends CapabilityOf<M> ? { readonly thinking?: boolean } : { readonly thinking?: never }) &
  ('tools' extends CapabilityOf<M> ? { readonly tools?: readonly string[] } : { readonly tools?: never });

/** A request bound to the model that can serve it. */
export type Request<M extends Model> = {
  readonly model: IdOf<M>;
  readonly prompt: string;
  readonly options: Options<M>;
};

/**
 * Builds a request whose options are constrained by the model's declared capabilities — asking a
 * tool-less model for tools does not type-check.
 */
export const createRequest = <M extends Model>(
  model: M,
  prompt: string,
  options: Options<M> = {} as Options<M>,
): Request<M> => ({
  model: model.id as IdOf<M>,
  prompt,
  options,
});
