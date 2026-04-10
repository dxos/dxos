//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import type * as Layer from 'effect/Layer';
import * as Types from 'effect/Types';

// @import-as-namespace

export const TypeId = '~@dxos/functions-runtime/LayerSpec' as const;
export type TypeId = typeof TypeId;

/**
 * Untyped layer specification with introspectable tags.
 * Used to define services with their dependencies and affinity.
 */
export interface LayerSpec {
  readonly [TypeId]: TypeId;

  readonly affinity: Affinity;
  readonly requires: readonly Context.Tag<any, any>[];
  readonly provides: readonly Context.Tag<any, any>[];

  readonly layer: Layer.Layer<any, never, any>;
}

/**
 * Affinity defines the lifetime and scope of a service.
 *
 * - `application` - single service instance is available throughout the entire application.
 * - `space` - service is instantiated per space.
 * - `process` - separate service instance is created and destroyed for each process.
 */
export type Affinity = 'application' | 'space' | 'process';

interface MakeOpts {
  readonly affinity: Affinity;
  readonly requires: readonly Context.Tag<any, any>[];
  readonly provides: readonly Context.Tag<any, any>[];
}

/**
 * Make a layer specification.
 */
export const make = <const Opts extends Types.NoExcessProperties<MakeOpts, Opts>>(
  opts: Opts,
  layer: Layer.Layer<Context.Tag.Identifier<Opts['provides'][number]>, never, Context.Tag.Identifier<Opts['requires'][number]>>,
): LayerSpec => {
  return {
    [TypeId]: TypeId,
    affinity: opts.affinity,
    requires: opts.requires,
    provides: opts.provides,
    layer,
  };
};
