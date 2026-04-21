//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';

import { ServiceResolver, type ServiceNotAvailableError } from '@dxos/functions';
import type { SpaceId } from '@dxos/keys';

import { Capabilities } from '../common';
import { Capability } from '../core';

/**
 * Build a {@link Layer} that materialises space-scoped services from the shared
 * {@link Capabilities.ServiceResolver}.
 *
 * The returned layer has no outstanding requirements (ServiceResolver is
 * provided from the {@link Capabilities.ServiceResolver} capability) and can be
 * used with {@link Effect.provide} on any effect that needs space services.
 *
 * @example
 * ```ts
 * yield* someEffect.pipe(
 *   Effect.provide(yield* provideSpaceServices(spaceId, [Database.Service, QueueService])),
 * );
 * ```
 */
export const provideSpaceServices = <const Tags extends readonly Context.Tag<any, any>[]>(
  spaceId: SpaceId,
  tags: Tags,
): Effect.Effect<
  Layer.Layer<Context.Tag.Identifier<Tags[number]>, ServiceNotAvailableError, never>,
  never,
  Capability.Service
> =>
  Effect.gen(function* () {
    const resolver = yield* Capability.get(Capabilities.ServiceResolver).pipe(Effect.orDie);
    return ServiceResolver.provide({ space: spaceId }, ...tags).pipe(
      Layer.provide(Layer.succeed(ServiceResolver.ServiceResolver, resolver)),
    );
  });

/**
 * Run an effect through the shared {@link Capabilities.ProcessManagerRuntime},
 * first providing the requested space-scoped services via the shared
 * {@link Capabilities.ServiceResolver}.
 */
export const runInSpace = <const Tags extends readonly Context.Tag<any, any>[], A, E>(
  spaceId: SpaceId,
  tags: Tags,
  effect: Effect.Effect<
    A,
    E,
    Context.Tag.Identifier<Tags[number]> | Capabilities.ProcessManagerRuntimeServices
  >,
): Effect.Effect<A, E, Capability.Service> =>
  Effect.gen(function* () {
    const runtime = yield* Capability.get(Capabilities.ProcessManagerRuntime).pipe(Effect.orDie);
    const layer = yield* provideSpaceServices(spaceId, tags);
    // Use `runPromiseExit` + `Exit.match` so the effect's typed `E` failure
    // channel is preserved. `runPromise` would throw on failure and the caller
    // would see an untyped rejection via `Effect.promise`.
    const exit = yield* Effect.promise(() =>
      runtime.runPromiseExit(effect.pipe(Effect.provide(layer)) as Effect.Effect<A, E, any>),
    );
    return yield* Exit.match(exit as Exit.Exit<A, E>, {
      onSuccess: (value) => Effect.succeed(value),
      onFailure: (cause) => Effect.failCause(cause),
    });
  });
