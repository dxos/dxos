//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Ref } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { Markdown } from '@dxos/plugin-markdown/types';

export default defineFunction({
  key: 'dxos.org/function/markdown/create',
  name: 'Create markdown document',
  description: 'Creates a new markdown document.',
  inputSchema: Schema.Struct({
    name: Schema.String.annotations({
      description: 'Name of the document.',
    }),
    content: Schema.String.annotations({
      description: 'Content of the document.',
    }),
  }),
  outputSchema: Schema.Void,
  handler: Effect.fn(function* ({ data: { name, content } }) {
    const doc = yield* Database.Service.add(Markdown.make({ name, content }));
    return { document: Ref.make(doc) };
  }),
});
