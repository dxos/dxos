//
// Copyright 2025 DXOS.org
//
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Array from 'effect/Array';
import * as Either from 'effect/Either';

import { AiService } from '@dxos/ai';
import { Rx, Registry } from '@effect-rx/rx';

import { FunctionDefinition } from '../handler';

import { CredentialsService } from './credentials';
import { DatabaseService } from './database';
import {
  FunctionImplementationResolver,
  type InvocationServices,
  LocalFunctionExecutionService,
} from './local-function-execution';
import { QueueService } from './queues';
import { RemoteFunctionExecutionService } from './remote-function-execution-service';
import { Query } from '@dxos/echo';
import { Function } from '../types/Function';

export type FunctionsQuery = {
  key?: string | string[];

  // TODO(dmaretskyi): name, tags, input/output schema
};

export type QueryResult = {
  readonly results: Effect.Effect<FunctionDefinition.Any[]>;
  readonly rx: Rx.Rx<FunctionDefinition.Any[]>;
};

/**
 * Functions registry.
 */
export class FunctionRegistryService extends Context.Tag('@dxos/functions/FunctionRegistryService')<
  FunctionRegistryService,
  {
    /**
     * Query functions registry.
     */
    query: (query?: FunctionsQuery) => Effect.Effect<QueryResult>;

    /**
     * Imports a function into the local space.
     * @returns The stored function object.
     * If the function is already imported, returns the existing function.
     * Can be used to resolve a function to it's database version.
     */
    import: (func: FunctionDefinition.Any) => Effect.Effect<Function>;

    // TODO(dmaretskyi): import function to local space
  }
>() {
  static query = Effect.serviceFunctionEffect(FunctionRegistryService, (_) => _.query);
  static import = Effect.serviceFunctionEffect(FunctionRegistryService, (_) => _.import);

  static layer = Layer.effect(
    FunctionRegistryService,
    Effect.gen(function* () {
      const staticFunctionsProvider = yield* StaticFunctionsProvider;
      const registry = yield* Registry.RxRegistry;
      const db = yield* DatabaseService;

      return {
        query: Effect.fn('FunctionRegistryService.query')(
          function* (query = {}) {
            const dbQuery = yield* DatabaseService.query(Query.type(Function));
            return {
              results: Effect.gen(function* () {
                const dbFunctions = yield* DatabaseService.query(Query.type(Function)).objects;

                return Array.unionWith(
                  dbFunctions.map(FunctionDefinition.deserialize),
                  yield* Rx.get(staticFunctionsProvider.functions),
                  (a, b) => a.key === b.key,
                );
              }).pipe(Effect.provideService(Registry.RxRegistry, registry), Effect.provideService(DatabaseService, db)),
              rx: Rx.make((get) => {
                return Array.unionWith(
                  get(staticFunctionsProvider.functions),
                  get(dbQuery.rx).map(FunctionDefinition.deserialize),
                  (a, b) => a.key === b.key,
                );
              }),
            } satisfies QueryResult;
          },
          Effect.provideService(DatabaseService, db),
        ),

        import: Effect.fn('FunctionRegistryService.import')(
          function* (func) {
            const dbFunc = yield* DatabaseService.query(Query.type(Function, { key: func.key })).first.pipe(
              Effect.either,
            );

            if (Either.isLeft(dbFunc)) {
              return yield* DatabaseService.add(FunctionDefinition.serialize(func));
            } else {
              return dbFunc.right;
            }
          },
          Effect.provideService(DatabaseService, db),
        ),
      } satisfies Context.Tag.Service<FunctionRegistryService>;
    }),
  );
}

/**
 * Provides functions that are available in the current environment other then the ones in the database.
 */
export class StaticFunctionsProvider extends Context.Tag('@dxos/functions/StaticFunctionsProvider')<
  StaticFunctionsProvider,
  {
    functions: Rx.Rx<FunctionDefinition.Any[]>;
  }
>() {
  static toLayer = (impl: Context.Tag.Service<StaticFunctionsProvider>) => Layer.succeed(StaticFunctionsProvider, impl);

  static layerList = (functions: FunctionDefinition.Any[]) => this.toLayer({ functions: Rx.make(() => functions) });

  static layerEmpty = this.toLayer({ functions: Rx.make(() => []) });
}
