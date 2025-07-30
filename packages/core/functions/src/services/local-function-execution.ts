//
// Copyright 2025 DXOS.org
//

import { Context, Effect, Layer, Schema } from 'effect';

import { todo } from '@dxos/debug';

import type { FunctionContext, FunctionDefinition } from '../handler';
import type { Services } from './service-container';
import { FunctionError } from '../errors';

export class LocalFunctionExecutionService extends Context.Tag('LocalFunctionExecutionService')<
  LocalFunctionExecutionService,
  {
    // TODO(dmaretskyi): This should take function id instead of the definition object.
    // TODO(dmaretskyi): Services should be satisfied from environment rather then bubbled up.
    invokeFunction(fnDef: FunctionDefinition<any, any>, input: unknown): Effect.Effect<unknown, never, Services>;
  }
>() {
  static layer = Layer.succeed(LocalFunctionExecutionService, {
    invokeFunction: (fnDef, input) => invokeFunction(fnDef, input),
  });
}

const invokeFunction = (fnDef: FunctionDefinition<any, any>, input: any): Effect.Effect<unknown, never, Services> =>
  Effect.gen(function* () {
    // Assert input matches schema
    const assertInput = fnDef.inputSchema.pipe(Schema.asserts);
    (assertInput as any)(input);

    const context: FunctionContext = {
      getService: () => todo(),
      getSpace: async (_spaceId: any) => {
        throw new Error('Not available. Use the database service instead.');
      },
      space: undefined,
      get ai(): never {
        throw new Error('Not available. Use the ai service instead.');
      },
    };

    // TODO(dmaretskyi): This should be delegated to a function invoker service.
    const data = yield* Effect.gen(function* () {
      const result = fnDef.handler({ context, data: input });
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
        Effect.die(new FunctionError('Error running function', { context: { name: fnDef.name }, cause: defect })),
      ),
    );

    // Assert output matches schema
    const assertOutput = fnDef.outputSchema?.pipe(Schema.asserts);
    (assertOutput as any)(data);

    return data;
  }).pipe(Effect.withSpan('invokeFunction', { attributes: { name: fnDef.name } }));
