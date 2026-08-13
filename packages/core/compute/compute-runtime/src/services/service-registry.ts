//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import type * as Option from 'effect/Option';

import { ServiceNotAvailableError } from '@dxos/compute';

export namespace ServiceRegistry {
  export interface Service {
    resolve: <T extends Context.Key<any, any>>(tag: T) => Option.Option<Context.Service.Shape<T>>;
  }
}

export class ServiceRegistry extends Context.Service<ServiceRegistry, ServiceRegistry.Service>()(
  '@dxos/functions/ServiceRegistry',
) {
  /**
   * Resolves the service from the registry.
   * @param tag Service tag to resolve.
   * @throws {@link ServiceNotAvailableError} if the service is not found.
   * @returns Effect that resolve to the service.
   */
  static resolve: <T extends Context.Key<any, any>>(
    tag: T,
  ) => Effect.Effect<Context.Service.Shape<T>, ServiceNotAvailableError, ServiceRegistry> = (tag) =>
    ServiceRegistry.pipe(
      Effect.flatMap((registry) => Effect.fromOption(registry.resolve(tag))),
      Effect.mapError(() => new ServiceNotAvailableError(tag.key)),
    );

  static provide: {
    <Tags extends [Context.Key<any, any>, ...Context.Key<any, any>[]]>(
      ...tags: Tags
    ): <A, E, R>(
      effect: Effect.Effect<A, E, R>,
    ) => Effect.Effect<
      A,
      E | ServiceNotAvailableError,
      Exclude<R, { [K in keyof Tags]: Context.Service.Identifier<Tags[K]> }[number]> | ServiceRegistry
    >;
  } = (...tags) =>
    (Function.flow as any)(...tags.map((tag) => Effect.provideServiceEffect(tag, ServiceRegistry.resolve(tag))));

  static provideOrDie: {
    <Tags extends [Context.Key<any, any>, ...Context.Key<any, any>[]]>(
      ...tags: Tags
    ): <A, E, R>(
      effect: Effect.Effect<A, E, R>,
    ) => Effect.Effect<
      A,
      E,
      Exclude<R, { [K in keyof Tags]: Context.Service.Identifier<Tags[K]> }[number]> | ServiceRegistry
    >;
  } = (...tags) =>
    (Function.flow as any)(
      ...tags.map((tag) => Effect.provideServiceEffect(tag, ServiceRegistry.resolve(tag).pipe(Effect.orDie))),
    );
}
