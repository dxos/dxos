//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { Filter } from '@dxos/echo-db';
import { DatabaseService, defineFunction } from '@dxos/functions';

import { Assistant } from '../types';

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
    // TODO(burdon): Get binder from tool context? Remember must run on EDGE also.
    // TODO(burdon): Unit test and error handling for tools/functions.
    // TODO(burdon): Hack to get all chats and guess which one we are in.
    const { objects: chats } = yield* DatabaseService.runQuery(Filter.type(Assistant.Chat));
    return { objects: [] };
  }),
});
