//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { type SpaceId } from '@dxos/client/echo';
import { runAndForwardErrors } from '@dxos/effect';

import type { RuntimeFunctionContext, FunctionDefinition } from '../handler';
import type { ServiceContainer, RuntimeServices } from '../services';

/**
 * @deprecated Use `FunctionInvocationService`
 */
export class FunctionExecutor {
  constructor(private readonly _services: ServiceContainer) {}

  /**
   * Invoke function.
   */
  // TODO(dmaretskyi): Invocation context: queue, space, etc...
  async invoke<F extends FunctionDefinition<any, any>>(
    functionDef: F,
    input: F extends FunctionDefinition<infer I, infer _O> ? I : never,
  ): Promise<F extends FunctionDefinition<infer _I, infer O> ? O : never> {
    // Assert input matches schema
    const assertInput = functionDef.inputSchema.pipe(Schema.asserts);
    (assertInput as any)(input);

    const context: RuntimeFunctionContext = {
      space: undefined,
      getService: this._services.getService.bind(this._services),
      getSpace: async (_spaceId: SpaceId) => {
        throw new Error('Not available. Use the database service instead.');
      },
    };

    const result = functionDef.handler({ context, data: input });

    let data: unknown;
    if (Effect.isEffect(result)) {
      data = await (result as Effect.Effect<unknown, unknown, RuntimeServices>).pipe(
        Effect.provide(this._services.createLayer()),
        runAndForwardErrors,
      );
    } else {
      data = await result;
    }

    // Assert output matches schema
    const assertOutput = functionDef.outputSchema?.pipe(Schema.asserts);
    (assertOutput as any)(data);

    return data as any;
  }
}
