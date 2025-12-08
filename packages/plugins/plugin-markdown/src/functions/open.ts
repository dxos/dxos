//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ArtifactId } from '@dxos/assistant';
import { Database } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';

import { Markdown } from '../types';

export default defineFunction({
  key: 'dxos.org/function/markdown/open',
  name: 'Open',
  description: 'Opens and reads the contents of a new markdown document.',
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'The ID of the markdown document.',
    }),
  }),
  outputSchema: Schema.Struct({
    content: Schema.String,
  }),
  handler: Effect.fn(function* ({ data: { id } }) {
    const object = yield* Database.Service.resolve(ArtifactId.toDXN(id), Markdown.Document);
    const { content } = yield* Effect.promise(() => object.content.load());
    return {
      content,
    };
  }),
});
