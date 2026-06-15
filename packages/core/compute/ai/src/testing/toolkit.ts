//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { trim } from '@dxos/util';

import { CalculatorTool, calculatorHandler } from './calculator';

export const TestingToolkit = Toolkit.make(
  CalculatorTool,

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
);

export const testingLayer = TestingToolkit.toLayer({
  Calculator: calculatorHandler,

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
