//
// Copyright 2025 DXOS.org
//

import { Context, Effect, Layer, Schema } from 'effect';

import { AiService } from '@dxos/ai';
import { todo } from '@dxos/debug';
import { log } from '@dxos/log';

import { FunctionError, FunctionNotFoundError } from '../errors';
import type { FunctionContext, FunctionDefinition } from '../handler';

import { CredentialsService } from './credentials';
import { DatabaseService } from './database';
import { type ComputeEventLogger } from './event-logger';
import { QueueService } from './queues';
import { RemoteFunctionExecutionService } from './remote-function-execution-service';
import { type Services } from './service-container';
import { type TracingService } from './tracing';

/**
 * Services that are provided at the function call site.
 */
export type InvocationServices = TracingService | ComputeEventLogger;

export class LocalFunctionExecutionService extends Context.Tag('@dxos/functions/LocalFunctionExecutionService')<
  LocalFunctionExecutionService,
  {
    // TODO(dmaretskyi): This should take function id instead of the definition object.
    // TODO(dmaretskyi): Services should be satisfied from environment rather then bubbled up.
    invokeFunction<I, O>(functionDef: FunctionDefinition<I, O>, input: I): Effect.Effect<O, never, InvocationServices>;
  }
>() {
  static layerLive = Layer.effect(
    LocalFunctionExecutionService,
    Effect.gen(function* () {
      // TODO(dmaretskyi): Use `yield* Effect.context()`;
      const resolver = yield* FunctionImplementationResolver;
      const ai = yield* AiService.AiService;
      const credentials = yield* CredentialsService;
      const database = yield* DatabaseService;
      const queues = yield* QueueService;
      // TODO(mykola): Delete, should not be required for local execution.
      const functionCallService = yield* RemoteFunctionExecutionService;
      return {
        // TODO(dmaretskyi): Better error types.
        invokeFunction: <I, O>(
          functionDef: FunctionDefinition<I, O>,
          input: I,
        ): Effect.Effect<O, never, InvocationServices> =>
          Effect.gen(function* () {
            const resolved = yield* resolver.resolveFunctionImplementation(functionDef).pipe(Effect.orDie);
            const output = yield* invokeFunction(resolved, input);
            return output as O;
          }).pipe(
            Effect.provideService(AiService.AiService, ai),
            Effect.provideService(CredentialsService, credentials),
            Effect.provideService(DatabaseService, database),
            Effect.provideService(QueueService, queues),
            Effect.provideService(RemoteFunctionExecutionService, functionCallService),
          ),
      };
    }),
  );

  static invokeFunction: <F extends FunctionDefinition.Any>(
    functionDef: F,
    input: FunctionDefinition.Input<F>,
  ) => Effect.Effect<FunctionDefinition.Output<F>, never, Services | LocalFunctionExecutionService> =
    Effect.serviceFunctionEffect(LocalFunctionExecutionService, (_) => _.invokeFunction as any);
}

const invokeFunction = (
  functionDef: FunctionDefinition<any, any>,
  input: any,
): Effect.Effect<unknown, never, Services> =>
  Effect.gen(function* () {
    // Assert input matches schema.
    try {
      const assertInput = functionDef.inputSchema.pipe(Schema.asserts);
      (assertInput as any)(input);
    } catch (e) {
      throw new FunctionError({ message: 'Invalid function input', context: { name: functionDef.name }, cause: e });
    }

    const context: FunctionContext = {
      space: undefined,
      getService: () => todo(),
      getSpace: async (_spaceId: any) => {
        throw new Error('Not available. Use the database service instead.');
      },
    };

    log.info('invoking function', { name: functionDef.name, input });

    // TODO(dmaretskyi): This should be delegated to a function invoker service.
    const data = yield* Effect.gen(function* () {
      const result = functionDef.handler({ context, data: input });
      if (Effect.isEffect(result)) {
        return yield* (result as Effect.Effect<unknown, unknown, Services>).pipe(Effect.orDie);
      } else if (
        typeof result === 'object' &&
        result !== null &&
        'then' in result &&
        typeof result.then === 'function'
      ) {
        return yield* Effect.promise(() => result);
      } else {
        return result;
      }
    }).pipe(
      Effect.orDie,
      Effect.catchAllDefect((defect) =>
        Effect.die(new FunctionError({ context: { name: functionDef.name }, cause: defect })),
      ),
    );

    log.info('completed', { function: functionDef.name, input, data });

    // Assert output matches schema.
    try {
      const assertOutput = functionDef.outputSchema?.pipe(Schema.asserts);
      (assertOutput as any)(data);
    } catch (e) {
      throw new FunctionError({ message: 'Invalid function output', context: { name: functionDef.name }, cause: e });
    }

    return data;
  }).pipe(Effect.withSpan('invokeFunction', { attributes: { name: functionDef.name } }));

export class FunctionImplementationResolver extends Context.Tag('@dxos/functions/FunctionImplementationResolver')<
  FunctionImplementationResolver,
  {
    resolveFunctionImplementation<I, O>(
      functionDef: FunctionDefinition<I, O>,
    ): Effect.Effect<FunctionDefinition<I, O>, FunctionNotFoundError>;
  }
>() {
  static layerTest = ({ functions }: { functions: FunctionDefinition<any, any>[] }) =>
    Layer.succeed(FunctionImplementationResolver, {
      resolveFunctionImplementation: <I, O>(functionDef: FunctionDefinition<I, O>) => {
        const resolved = functions.find((f) => f.key === functionDef.key);
        if (!resolved) {
          return Effect.fail(new FunctionNotFoundError(functionDef.name));
        }
        return Effect.succeed(resolved);
      },
    });
}
