import { Effect, Schema } from 'effect';
import type { FunctionContext, FunctionDefinition } from '../handler';
import type { ServiceContainer } from '../services';
import type { SpaceId } from '@dxos/client/echo';

export class FunctionExecutor {
  constructor(private readonly _services: ServiceContainer) {}

  // TODO(dmaretskyi): Invocation context: queue, space, etc...
  async invoke<T, O>(fnDef: FunctionDefinition<T, O>, input: T): Promise<O> {
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

    const result = await fnDef.handler({ context, data: input });

    // Assert output matches schema
    const assertOutput = fnDef.outputSchema?.pipe(Schema.asserts);
    (assertOutput as any)(result);

    if (Effect.isEffect(result)) {
      return Effect.runPromise(result);
    }

    return result as O;
  }
}
