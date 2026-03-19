//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { runAndForwardErrors } from '@dxos/effect';
import { type Operation } from '@dxos/operation';

import type { RuntimeServices, ServiceContainer } from '../services';

/**
 * @deprecated Use `FunctionInvocationService`
 */
export class FunctionExecutor {
  constructor(private readonly _services: ServiceContainer) {}

  /**
   * Invoke function.
   */
  async invoke<F extends Operation.WithHandler<Operation.Definition.Any>>(
    functionDef: F,
    input: Operation.Definition.Input<F>,
  ): Promise<Operation.Definition.Output<F>> {
    // Assert input matches schema.
    const assertInput = functionDef.input.pipe(Schema.asserts);
    (assertInput as any)(input);

    const result = functionDef.handler(input);

    let data: unknown;
    if (Effect.isEffect(result)) {
      data = await (result as Effect.Effect<unknown, unknown, RuntimeServices>).pipe(
        Effect.provide(this._services.createLayer()),
        runAndForwardErrors,
      );
    } else {
      data = await result;
    }

    // Assert output matches schema.
    const assertOutput = functionDef.output?.pipe(Schema.asserts);
    (assertOutput as any)(data);

    return data as any;
  }
}
