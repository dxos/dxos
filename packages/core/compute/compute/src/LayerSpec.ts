//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Layer from 'effect/Layer';
import * as Types from 'effect/Types';

import { SpaceId, type URI } from '@dxos/keys';

import type * as Process from './Process';

// @import-as-namespace

export const TypeId = '~@dxos/functions/LayerSpec' as const;
export type TypeId = typeof TypeId;

/**
 * Opaque layer with introspectable tags.
 */
export interface LayerSpec {
  readonly [TypeId]: TypeId;

  readonly affinity: Affinity;
  readonly requires: readonly Context.Tag<any, any>[];
  readonly provides: readonly Context.Tag<any, any>[];

  // opaque service creation function, layer provides the specified services and requires the specified requirements.
  readonly make: (context: LayerContext) => Layer.Layer<unknown, never, unknown>;
}

/**
 * Affinity defines the lifetime and scope of a service.
 *
 * - `application` - single service instance is available throughout the entire application.
 * - `space` - service is instantiated per space.
 * - `process` - separate service instance is created and destroyed for each process.
 */
export type Affinity = 'application' | 'space' | 'process';

/**
 * Provides context for service resolution.
 */
// TODO(dmaretskyi): Consider making this type dependant on the specified service affinity.
export interface LayerContext {
  /**
   * Under which space the process is running.
   * Space affinity and up only.
   */
  readonly space?: SpaceId;

  /**
   * URI of the conversation feed the process is running in.
   * Process affinity only.
   */
  readonly conversation?: URI.URI;

  /**
   * Under which process the process is running.
   * Process affinity only.
   */
  readonly process?: Process.ID;
}

interface MakeOpts {
  readonly affinity: Affinity;
  readonly requires: readonly Context.Tag<any, any>[];
  readonly provides: readonly Context.Tag<any, any>[];
}

/**
 * Make a service.
 */
export const make = <const Opts extends Types.NoExcessProperties<MakeOpts, Opts>>(
  opts: Opts,
  make: (
    context: LayerContext,
  ) => Layer.Layer<
    Context.Tag.Identifier<Opts['provides'][number]>,
    never,
    Context.Tag.Identifier<Opts['requires'][number]>
  >,
): LayerSpec => {
  return {
    [TypeId]: TypeId,
    affinity: opts.affinity,
    requires: opts.requires,
    provides: opts.provides,
    make: make as any,
  };
};
