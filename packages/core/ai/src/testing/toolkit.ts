import { log } from '@dxos/log';
import { AiTool, AiToolkit } from '@effect/ai';
import { Console, Effect, Schema } from 'effect';

// Tool definitions.
export class CalculatorToolkit extends AiToolkit.make(
  AiTool.make('Calculator', {
    description: 'Basic calculator tool',
    parameters: {
      input: Schema.String.annotations({
        description: 'The calculation to perform.',
      }),
    },
    success: Schema.Struct({
      result: Schema.Number,
    }),
    failure: Schema.Never,
  }),
) {}

// Tool handlers.
export const calculatorLayer = CalculatorToolkit.toLayer({
  Calculator: Effect.fn(function* ({ input }) {
    const result = (() => {
      // Restrict to basic arithmetic operations for safety.
      const sanitizedInput = input.replace(/[^0-9+\-*/().\s]/g, '');
      log.info('calculate', { sanitizedInput });

      // eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval
      return Function(`"use strict"; return (${sanitizedInput})`)();
    })();

    // TODO(burdon): How to return an error.
    yield* Console.log(`Executing calculation: ${input} = ${result}`);
    return { result };
  }),
});
