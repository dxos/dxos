//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiService } from '@dxos/ai';
import { Database, Feed, Query } from '@dxos/echo';
import {
  CredentialsService,
  FunctionError,
  FunctionInvocationService,
  FunctionNotFoundError,
  type InvocationServices,
  QueueService,
  Trace,
} from '@dxos/functions';
import { type FunctionServices } from '@dxos/functions';
import { log } from '@dxos/log';
import { Operation, OperationHandlerSet } from '@dxos/operation';
import { runAndForwardErrors } from '@dxos/effect';

export class LocalFunctionExecutionService extends Context.Tag('@dxos/functions/LocalFunctionExecutionService')<
  LocalFunctionExecutionService,
  {
    invokeFunction<I, O>(
      functionDef: Operation.Definition<I, O>,
      input: I,
    ): Effect.Effect<O, never, InvocationServices>;
    resolveFunction(key: string): Effect.Effect<Operation.Definition.Any, FunctionNotFoundError>;
  }
>() {
  static layerLive = Layer.effect(
    LocalFunctionExecutionService,
    Effect.gen(function* () {
      const resolver = yield* FunctionImplementationResolver;
      const ai = yield* AiService.AiService;
      const credentials = yield* CredentialsService;
      const database = yield* Database.Service;
      const queues = yield* QueueService;
      const feedService = yield* Feed.Service;
      const functionInvocationService = yield* FunctionInvocationService;
      return {
        invokeFunction: <I, O>(
          functionDef: Operation.Definition<I, O>,
          input: I,
        ): Effect.Effect<O, never, InvocationServices> =>
          Effect.flatMap(Effect.context<never>(), (callerContext) =>
            Effect.gen(function* () {
              const resolved = yield* resolver.resolveFunctionImplementation(functionDef).pipe(Effect.orDie);
              const output = yield* invokeOperation(resolved, input);
              return output as O;
            }).pipe(
              Effect.provideService(AiService.AiService, ai),
              Effect.provideService(CredentialsService, credentials),
              Effect.provideService(Database.Service, database),
              Effect.provideService(QueueService, queues),
              Effect.provideService(Feed.Service, feedService),
              Effect.provideService(FunctionInvocationService, functionInvocationService),
              Effect.provide(Trace.writerLayerNoop),
              Effect.provide(Layer.succeedContext(callerContext)),
            ),
          ),
        resolveFunction: (key: string) =>
          Effect.gen(function* () {
            // Try to resolve operation from database.
            const [dbRecord] = yield* Database.runQuery(Query.type(Operation.PersistentOperation, { key }));
            const operationDef = dbRecord ? Operation.deserialize(dbRecord) : null;
            if (operationDef) {
              return operationDef;
            }

            // Try to resolve operation from the FunctionImplementationResolver.
            const resolved = yield* resolver.resolveByKey(key).pipe(Effect.either);
            if (Either.isRight(resolved)) {
              return resolved.right;
            }

            return yield* Effect.fail(new FunctionNotFoundError(key));
          }).pipe(Effect.provideService(Database.Service, database)),
      };
    }),
  );

  static invokeFunction: <I, O>(
    functionDef: Operation.Definition<I, O>,
    input: Operation.Definition.Input<Operation.Definition<I, O>>,
  ) => Effect.Effect<
    Operation.Definition.Output<Operation.Definition<I, O>>,
    never,
    FunctionServices | LocalFunctionExecutionService
  > = Effect.serviceFunctionEffect(LocalFunctionExecutionService, (_) => _.invokeFunction as any);
}

const invokeOperation = (
  operationDef: Operation.WithHandler<Operation.Definition.Any>,
  input: any,
): Effect.Effect<unknown, never, FunctionServices> =>
  Effect.gen(function* () {
    const functionInvocationService = yield* FunctionInvocationService;

    // Assert input matches schema.
    try {
      const assertInput = operationDef.input.pipe(Schema.asserts);
      (assertInput as any)(input);
    } catch (err) {
      throw new FunctionError({
        message: 'Invalid function input',
        context: { name: operationDef.meta.name },
        cause: err,
      });
    }

    log('invoking operation', { name: operationDef.meta.name, input });

    // Provide Operation.Service backed by FunctionInvocationService so handlers
    // can invoke other operations through the same execution pipeline.
    // TODO(wittjosiah): Improve type safety once FunctionServices includes Operation.Service.
    const operationService = {
      invoke: (op: any, ...args: any[]) => functionInvocationService.invokeFunction(op, args[0]),
      schedule: (op: any, ...args: any[]) =>
        functionInvocationService.invokeFunction(op, args[0]).pipe(Effect.fork, Effect.asVoid),
      invokePromise: async (op: any, ...args: any[]) => {
        try {
          const data = await runAndForwardErrors(
            functionInvocationService.invokeFunction(op, args[0]) as unknown as Effect.Effect<any>,
          );
          return { data };
        } catch (error) {
          return { error: error as Error };
        }
      },
    } as unknown as Operation.OperationService;

    const data = yield* Effect.gen(function* () {
      const result = operationDef.handler(input);
      if (Effect.isEffect(result)) {
        return yield* (result as Effect.Effect<unknown, unknown, FunctionServices>).pipe(
          Effect.provideService(Operation.Service, operationService),
          Effect.orDie,
        );
      } else if (
        typeof result === 'object' &&
        result !== null &&
        'then' in result &&
        typeof result.then === 'function'
      ) {
        return yield* Effect.promise(() => result as any);
      } else {
        return result;
      }
    }).pipe(
      Effect.orDie,
      Effect.catchAllDefect((defect) =>
        Effect.die(new FunctionError({ context: { name: operationDef.meta.name }, cause: defect })),
      ),
    );

    log('completed', { operation: operationDef.meta.name, input, data });

    // Assert output matches schema.
    try {
      const assertOutput = operationDef.output?.pipe(Schema.asserts);
      (assertOutput as any)(data);
    } catch (err) {
      throw new FunctionError({
        message: 'Invalid function output',
        context: { name: operationDef.meta.name },
        cause: err,
      });
    }

    return data;
  }).pipe(Effect.withSpan('invokeOperation', { attributes: { name: operationDef.meta.name } }));

export class FunctionImplementationResolver extends Context.Tag('@dxos/functions/FunctionImplementationResolver')<
  FunctionImplementationResolver,
  {
    resolveFunctionImplementation<I, O>(
      functionDef: Operation.Definition<I, O>,
    ): Effect.Effect<Operation.WithHandler<Operation.Definition<I, O>>, FunctionNotFoundError>;

    resolveByKey(key: string): Effect.Effect<Operation.WithHandler<Operation.Definition.Any>, FunctionNotFoundError>;
  }
>() {
  static layerTest = ({ functions }: { functions: OperationHandlerSet.OperationHandlerSet }) =>
    Layer.effect(
      FunctionImplementationResolver,
      Effect.gen(function* () {
        const handlers = yield* functions.handlers;
        return {
          resolveFunctionImplementation: <I, O>(functionDef: Operation.Definition<I, O>) => {
            const resolved = handlers.find((f) => f.meta.key === functionDef.meta.key);
            if (!resolved) {
              return Effect.fail(new FunctionNotFoundError(functionDef.meta.name ?? functionDef.meta.key));
            }

            return Effect.succeed(resolved);
          },

          resolveByKey: (key: string) =>
            Effect.gen(function* () {
              const resolved = handlers.find((_) => _.meta.key === key);
              if (!resolved) {
                return yield* Effect.fail(new FunctionNotFoundError(key));
              }
              return resolved;
            }),
        };
      }),
    );
}
