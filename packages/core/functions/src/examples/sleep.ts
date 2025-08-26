import { defineFunction } from '../handler';
import { Effect, Schema } from 'effect';

export default defineFunction({
  name: 'example.org/function/sleep',
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
