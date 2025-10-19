//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { log } from '@dxos/log';
import { trim } from '@dxos/util';

// Tool definitions.
export class TestingToolkit extends Toolkit.make(
  Tool.make('Calculator', {
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

  Tool.make('Markdown', {
    description: 'Load markdown document',
    parameters: {
      name: Schema.String.annotations({
        description: 'The document name.',
      }),
    },
    success: Schema.Struct({
      result: Schema.String,
    }),
    failure: Schema.Never,
  }),
) {}

// Tool handlers.
export const testingLayer = TestingToolkit.toLayer({
  Calculator: Effect.fn(function* ({ input }) {
    const result = (() => {
      // Restrict to basic arithmetic operations for safety.
      const sanitizedInput = input.replace(/[^0-9+\-*/().\s]/g, '');
      log.info('calculate', { sanitizedInput });

      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      return new Function(`"use strict"; return (${sanitizedInput})`)();
    })();

    // TODO(burdon): How to return an error.
    yield* Console.log(`Executing calculation: ${input} = ${result}`);
    return { result };
  }),

  Markdown: Effect.fn(function* ({ name }) {
    yield* Console.log(`Reading markdown: ${name}`);
    return { result: documents[name] };
  }),
});

const documents: Record<string, string> = {
  'test.md': trim`
    # Test

    This is a test document.
    It has some spelllling mistakes.
    But it's quite short.
  `,
};
