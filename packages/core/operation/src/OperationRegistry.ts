//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { Database, Query } from '@dxos/echo';

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
          Database.runQueryFirst(Query.type(Operation.PersistentOperation, { key }))
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
