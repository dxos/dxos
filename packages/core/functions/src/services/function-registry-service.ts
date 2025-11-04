//
// Copyright 2025 DXOS.org
//
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

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

// @import-as-namespace

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
  }
>() {
  static layer = Layer.effect(
    FunctionRegistryService,
    Effect.gen(function* () {
      const staticFunctionsProvider = yield* StaticFunctionsProvider;
      const registry = yield* Registry.RxRegistry;
      const db = yield* DatabaseService;

      return {
        query: Effect.fnUntraced(
          function* (query = {}) {
            const dbQuery = yield* DatabaseService.query(Query.type(Function));
            return {
              results: Effect.gen(function* () {
                const dbFunctions = yield* DatabaseService.query(Query.type(Function)).objects;

                // TODO(dmaretskyi): Dedup.
                return [
                  ...dbFunctions.map(FunctionDefinition.deserialize),
                  ...(yield* Rx.get(staticFunctionsProvider.functions)),
                ];
              }).pipe(Effect.provideService(Registry.RxRegistry, registry), Effect.provideService(DatabaseService, db)),
              rx: Rx.make((get) => {
                // TODO(dmaretskyi): Dedup.
                return [
                  ...get(staticFunctionsProvider.functions),
                  ...get(dbQuery.rx).map(FunctionDefinition.deserialize),
                ];
              }),
            } satisfies QueryResult;
          },
          Effect.provideService(DatabaseService, db),
        ),
      };
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
}
