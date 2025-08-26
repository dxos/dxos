import { Effect, Schema } from 'effect';
import { defineFunction } from '../handler';

export default defineFunction({
  name: 'example.org/function/fib',
  description: 'Function that calculates a Fibonacci number',
  inputSchema: Schema.Struct({
    iterations: Schema.optional(Schema.Number).annotations({
      description: 'Number of iterations',
      default: 100_000,
    }),
  }),
  outputSchema: Schema.Struct({
    result: Schema.String,
  }),
  handler: Effect.fn(function* ({ data: { iterations = 100_000 } }) {
    let a = 0n;
    let b = 1n;
    for (let i = 0; i < iterations; i++) {
      a += b;
      b = a - b;
    }
    return { result: a.toString() };
  }),
});
