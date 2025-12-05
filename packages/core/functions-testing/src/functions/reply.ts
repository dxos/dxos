//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { defineFunction } from '@dxos/functions';

export default defineFunction({
  key: 'example.org/function/reply',
  name: 'Reply',
  description: 'Function that echoes the input',
  inputSchema: Schema.Any,
  outputSchema: Schema.Any,
  handler: Effect.fn(function* ({ data }) {
    yield* Console.log('reply', { data });
    return data;
  }),
});
