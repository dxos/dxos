//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { defineFunction } from '@dxos/functions';

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
