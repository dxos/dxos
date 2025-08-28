import { Effect, Schema } from 'effect';
import { defineFunction } from '../handler';

export default defineFunction({
  name: 'example.org/function/reply',
  description: 'Function that echoes the input',
  inputSchema: Schema.Any,
  outputSchema: Schema.Any,
  handler: Effect.fn(function* ({ data }) {
    console.log('reply', { data });
    return data;
  }),
});
