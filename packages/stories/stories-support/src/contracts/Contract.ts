//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';

import { BaseError } from '@dxos/errors';

/** A processor failed; `context` names the contract and the method. */
export class ProcessorError extends BaseError.extend('ProcessorError', 'The processor failed.') {}

/** One method of a contract: a payload schema and a result schema. */
export type MethodSpec = {
  readonly payload: Schema.Top;
  readonly success: Schema.Top;
};

export type Methods = Readonly<Record<string, MethodSpec>>;

/**
 * A processor contract: a key, a version and schema-typed methods. This is the shape `Service.make` takes in the plugin
 * services design (dxos/dxos#14693), without properties and events, so a contract here becomes a service there by
 * changing how it is registered.
 */
export interface Contract<Key extends string = string, M extends Methods = Methods> {
  readonly key: Key;
  /** Semver of the interface. */
  readonly version: string;
  readonly methods: M;
}

export type Any = Contract<string, Methods>;

/** What a provider implements and a consumer calls. */
export type Implementation<C extends Any> = {
  readonly [K in keyof C['methods']]: (
    payload: Schema.Schema.Type<C['methods'][K]['payload']>,
  ) => Effect.Effect<Schema.Schema.Type<C['methods'][K]['success']>, ProcessorError>;
};

/** Defines a contract. `key` is an NSID. */
export const make = <const Key extends string, const M extends Methods>(
  key: Key,
  spec: { readonly version: string; readonly methods: M },
): Contract<Key, M> => ({ key, version: spec.version, methods: spec.methods });

/** Whether a provider at `provided` satisfies a consumer built against `wanted`: same major, equal or higher minor. */
export const satisfies = (provided: string, wanted: string): boolean => {
  const [providedMajor, providedMinor = 0] = provided.split('.').map(Number);
  const [wantedMajor, wantedMinor = 0] = wanted.split('.').map(Number);
  return providedMajor === wantedMajor && providedMinor >= wantedMinor;
};
