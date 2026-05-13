//
// Copyright 2026 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { log } from '@dxos/log';

/**
 * Basic calculator tool used across LLM tests.
 *
 * Evaluates simple arithmetic expressions. Restricted to `+ - * / ( ) .` and digits
 * to keep `eval`-like behavior safe.
 */
export const CalculatorTool = Tool.make('Calculator', {
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
});

/**
 * Shared handler for {@link CalculatorTool}. Reuse this when composing the tool
 * into a larger toolkit to avoid duplicating the handler.
 */
export const calculatorHandler = Effect.fn(function* ({ input }: { input: string }) {
  const sanitizedInput = input.replace(/[^0-9+\-*/().\s]/g, '');
  log.info('calculate', { sanitizedInput });

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const result = new Function(`"use strict"; return (${sanitizedInput})`)() as number;

  yield* Console.log(`Executing calculation: ${input} = ${result}`);
  return { result };
});

/**
 * Standalone toolkit containing only the calculator tool.
 */
export const CalculatorToolkit = Toolkit.make(CalculatorTool);

/**
 * Handler layer for {@link CalculatorToolkit}.
 */
export const CalculatorLayer = CalculatorToolkit.toLayer({
  Calculator: calculatorHandler,
});
