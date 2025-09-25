//
// Copyright 2025 DXOS.org
//

import { Context, Effect, Layer, Schema } from 'effect';

import { todo } from '@dxos/debug';
import { log } from '@dxos/log';

import { FunctionError, FunctionNotFoundError } from '../errors';
import type { FunctionContext, FunctionDefinition } from '../handler';

import type { Services } from './service-container';

export class LocalFunctionExecutionService extends Context.Tag('@dxos/functions/LocalFunctionExecutionService')<
  LocalFunctionExecutionService,
  {
    // TODO(dmaretskyi): This should take function id instead of the definition object.
    // TODO(dmaretskyi): Services should be satisfied from environment rather then bubbled up.
    invokeFunction(functionDef: FunctionDefinition<any, any>, input: unknown): Effect.Effect<unknown, never, Services>;
  }
>() {
  /**
   * @deprecated Use layerLive instead.
   */
  static layer = Layer.succeed(LocalFunctionExecutionService, {
    invokeFunction: (functionDef, input) => invokeFunction(functionDef, input),
  });

  static layerLive = Layer.effect(
    LocalFunctionExecutionService,
    Effect.gen(function* () {
      const resolver = yield* FunctionImplementationResolver;
      return {
        invokeFunction: Effect.fn('invokeFunction')(function* (functionDef, input) {
          // TODO(dmaretskyi): Better error types
          const resolved = yield* resolver.resolveFunctionImplementation(functionDef).pipe(Effect.orDie);
          return yield* invokeFunction(resolved, input);
        }),
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
    // Assert input matches schema
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

    log.info('Invoking function', { name: functionDef.name, input });

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

    log.info('Function completed', { name: functionDef.name, input, data });

    // Assert output matches schema
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
    resolveFunctionImplementation(
      functionDef: FunctionDefinition<any, any>,
    ): Effect.Effect<FunctionDefinition<any, any>, FunctionNotFoundError>;
  }
>() {
  static layerTest = ({ functions }: { functions: FunctionDefinition<any, any>[] }) =>
    Layer.succeed(FunctionImplementationResolver, {
      resolveFunctionImplementation: (functionDef) => {
        const resolved = functions.find((f) => f.name === functionDef.name);
        if (!resolved) {
          return Effect.fail(new FunctionNotFoundError(functionDef.name));
        }
        return Effect.succeed(resolved);
      },
    });
}
