//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { defineFunction } from '@dxos/functions';

export default defineFunction({
  name: 'dxos.org/function/assistant-context',
  description: 'Retrieves objects from the curent chat context.',
  inputSchema: Schema.Struct({
    // TODO(burdon): DXN.
    typename: Schema.optional(Schema.String),
  }),
  outputSchema: Schema.Struct({
    // TODO(burdon): Return objects (and teach assistant how to read schema).
    objects: Schema.Array(Schema.Any),
  }),
  handler: Effect.fn(function* () {
    // TODO(burdon): Get binder from tool context.
    // TODO(burdon): Error handling for tools/functions.
    console.log('###');
    return { objects: [] };
  }),
});
