//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { Key } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';

export default defineFunction({
  name: 'dxos.org/function/assistant-context',
  description: 'Retrieves objects from the curent chat context.',
  inputSchema: Schema.Void,
  outputSchema: Schema.Struct({
    objects: Schema.Array(Key.ObjectId),
  }),
  handler: Effect.fn(function* () {
    console.log('!!!');
    // TODO(burdon): Get binder from tool context.
    return { objects: [] };
  }),
});
