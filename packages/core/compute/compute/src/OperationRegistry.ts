//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { Database, Filter, Query } from '@dxos/echo';

import * as Operation from './Operation.ts';
import * as OperationHandlerSet from './OperationHandlerSet.ts';

export interface OperationRegistry {
  /**
   * Resolve an operation by key.
   */
  resolve(key: string): Effect.Effect<Option.Option<Operation.Definition.Any>>;
}

export class Service extends Context.Service<Service, OperationRegistry>()('@dxos/operation/OperationRegistry') {}

/**
 * Resolve an operation by key.
 */
export const resolve: (key: string) => Effect.Effect<Option.Option<Operation.Definition.Any>, never, Service> = (
  ...args: Parameters<Context.Service.Shape<typeof Service>['resolve']>
) => Service.use((service) => service.resolve(...args));

export const layer: Layer.Layer<Service, never, Database.Service | OperationHandlerSet.OperationHandlerProvider> =
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const database = yield* Database.Service;
      const handlerSet = yield* OperationHandlerSet.OperationHandlerProvider;
      return {
        resolve: (key: string) =>
          Database.query(Query.select(Filter.and(Filter.type(Operation.PersistentOperation), Filter.key(key))))
            .first.pipe(
              Effect.flatMap((result) => Effect.fromOption(result)),
              Effect.map(Operation.deserialize),
              Effect.catchTag('NoSuchElementError', () => OperationHandlerSet.getHandlerByKey(handlerSet, key)),
              Effect.option,
            )
            .pipe(Effect.provideService(Database.Service, database)),
      };
    }),
  );
