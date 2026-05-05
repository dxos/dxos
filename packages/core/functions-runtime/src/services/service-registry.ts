//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import type * as Option from 'effect/Option';

import { Err } from '@dxos/compute';

export namespace ServiceRegistry {
  export interface Service {
    resolve: <T extends Context.Tag<any, any>>(tag: T) => Option.Option<Context.Tag.Service<T>>;
  }
}

export class ServiceRegistry extends Context.Tag('@dxos/functions/ServiceRegistry')<
  ServiceRegistry,
  ServiceRegistry.Service
>() {
  /**
   * Resolves the service from the registry.
   * @param tag Service tag to resolve.
   * @throws {@link Err.ServiceNotAvailableError} if the service is not found.
   * @returns Effect that resolve to the service.
   */
  static resolve: <T extends Context.Tag<any, any>>(
    tag: T,
  ) => Effect.Effect<T, Err.ServiceNotAvailableError, ServiceRegistry> = (tag) =>
    ServiceRegistry.pipe(
      Effect.flatMap((_) => _.resolve(tag)),
      Effect.mapError(() => new Err.ServiceNotAvailableError(tag.key)),
    );

  static provide: {
    <Tags extends [Context.Tag<any, any>, ...Context.Tag<any, any>[]]>(
      ...tags: Tags
    ): <A, E, R>(
      effect: Effect.Effect<A, E, R>,
    ) => Effect.Effect<
      A,
      E | Err.ServiceNotAvailableError,
      Exclude<R, { [K in keyof Tags]: Context.Tag.Identifier<Tags[K]> }[number]> | ServiceRegistry
    >;
  } = (...tags) =>
    (Function.flow as any)(...tags.map((tag) => Effect.provideServiceEffect(tag, ServiceRegistry.resolve(tag))));

  static provideOrDie: {
    <Tags extends [Context.Tag<any, any>, ...Context.Tag<any, any>[]]>(
      ...tags: Tags
    ): <A, E, R>(
      effect: Effect.Effect<A, E, R>,
    ) => Effect.Effect<
      A,
      E,
      Exclude<R, { [K in keyof Tags]: Context.Tag.Identifier<Tags[K]> }[number]> | ServiceRegistry
    >;
  } = (...tags) =>
    (Function.flow as any)(
      ...tags.map((tag) => Effect.provideServiceEffect(tag, ServiceRegistry.resolve(tag).pipe(Effect.orDie))),
    );
}
