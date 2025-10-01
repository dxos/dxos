//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { defineFunction } from '../handler';

export default defineFunction({
  key: 'example.org/function/sleep',
  name: 'Sleep',
  description: 'Function that sleeps for a given amount of time',
  inputSchema: Schema.Struct({
    duration: Schema.optional(Schema.Number).annotations({
      description: 'Milliseconds to sleep',
      default: 100_000,
    }),
  }),
  outputSchema: Schema.Void,
  handler: Effect.fn(function* ({ data: { duration = 100_000 } }) {
    yield* Effect.sleep(duration);
  }),
});
