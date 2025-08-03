//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import type { SpaceId } from '@dxos/client/echo';
import { runAndForwardErrors } from '@dxos/effect';

import type { FunctionContext, FunctionDefinition } from '../handler';
import type { ServiceContainer, Services } from '../services';

export class FunctionExecutor {
  constructor(private readonly _services: ServiceContainer) {}

  /**
   *
   */
  // TODO(dmaretskyi): Invocation context: queue, space, etc...
  async invoke<F extends FunctionDefinition<any, any>>(
    fnDef: F,
    input: F extends FunctionDefinition<infer I, infer _O> ? I : never,
  ): Promise<F extends FunctionDefinition<infer _I, infer O> ? O : never> {
    // Assert input matches schema
    const assertInput = fnDef.inputSchema.pipe(Schema.asserts);
    (assertInput as any)(input);

    const context: FunctionContext = {
      getService: this._services.getService.bind(this._services),
      getSpace: async (_spaceId: SpaceId) => {
        throw new Error('Not available. Use the database service instead.');
      },
      space: undefined,
      get ai(): never {
        throw new Error('Not available. Use the ai service instead.');
      },
    };

    const result = fnDef.handler({ context, data: input });

    let data: unknown;
    if (Effect.isEffect(result)) {
      data = await (result as Effect.Effect<unknown, unknown, Services>).pipe(
        Effect.provide(this._services.createLayer()),
        runAndForwardErrors,
      );
    } else {
      data = await result;
    }

    // Assert output matches schema
    const assertOutput = fnDef.outputSchema?.pipe(Schema.asserts);
    (assertOutput as any)(data);

    return data as any;
  }
}
