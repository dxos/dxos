//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ArtifactId } from '@dxos/assistant';
import { defineFunction } from '@dxos/functions';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Database } from '@dxos/echo';

export default defineFunction({
  key: 'dxos.org/function/markdown/read',
  name: 'Read markdown document',
  description: 'Read markdown document.',
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'The ID of the document to read.',
    }),
  }),
  outputSchema: Schema.Struct({
    content: Schema.String,
  }),
  handler: Effect.fn(function* ({ data: { id } }) {
    const doc = yield* Database.Service.resolve(ArtifactId.toDXN(id), Markdown.Document);
    const { content } = yield* Database.Service.load(doc.content);
    return { content };
  }),
});
