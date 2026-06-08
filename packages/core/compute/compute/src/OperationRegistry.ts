//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { Database, Filter, Query, Registry } from '@dxos/echo';

import * as Operation from './Operation';
import * as OperationHandlerSet from './OperationHandlerSet';

export interface OperationRegistry {
  /**
   * Resolve an operation by key.
   */
  resolve(key: string): Effect.Effect<Option.Option<Operation.Definition.Any>>;
}

export class Service extends Context.Tag('@dxos/operation/OperationRegistry')<Service, OperationRegistry>() {}

/**
 * Resolve an operation by key.
 */
export const resolve: (key: string) => Effect.Effect<Option.Option<Operation.Definition.Any>, never, Service> =
  Effect.serviceFunctionEffect(Service, (service) => service.resolve);

export const layer: Layer.Layer<Service, never, Database.Service | OperationHandlerSet.OperationHandlerProvider> =
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const database = yield* Database.Service;
      const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
      return {
        resolve: (key: string) =>
          Database.runQueryFirst(Query.select(Filter.and(Filter.type(Operation.PersistentOperation), Filter.key(key))))
            .pipe(
              Effect.flatten,
              Effect.map(Operation.deserialize),
              Effect.catchTag('NoSuchElementException', () => OperationHandlerSet.getHandlerByKey(handlerSet, key)),
              Effect.option,
            )
            .pipe(Effect.provideService(Database.Service, database)),
      };
    }),
  );

/**
 * Layer that seeds the `Registry.Service` with serialized operation definitions from
 * `OperationHandlerSet.OperationHandlerProvider`. Enables code that queries the echo
 * registry (e.g. `Template.processTemplate`, `makeToolResolverFromOperations`) to find
 * operations that are provided as in-process handlers.
 *
 * Usage: include this layer in your test/app stack after both
 * `Registry.Service` and `OperationHandlerSet.OperationHandlerProvider` are provided.
 */
export const operationsToRegistryLayer: Layer.Layer<
  Registry.Service,
  never,
  OperationHandlerSet.OperationHandlerProvider | Registry.Service
> = Layer.effect(
  Registry.Service,
  Effect.gen(function* () {
    const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
    const registry = yield* Registry.Service;
    const handlers = yield* handlerSet.handlers;
    registry.add(handlers.map(Operation.serialize));
    return registry;
  }),
);
