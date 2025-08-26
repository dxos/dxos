import { defineFunction } from '../handler';
import { Effect, Schema } from 'effect';

export default defineFunction({
  name: 'example.org/function/echo',
  description: 'Function that echoes the input',
  inputSchema: Schema.Any,
  outputSchema: Schema.Any,
  handler: Effect.fn(function* ({ data }) {
    return data;
  }),
});
