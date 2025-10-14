//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ArtifactId } from '@dxos/assistant';
import { DatabaseService, defineFunction } from '@dxos/functions';
import { Markdown } from '@dxos/plugin-markdown/types';

export default defineFunction({
  key: 'dxos.org/function/markdown/update',
  name: 'Update markdown',
  description: 'Updates the entire contents of the markdown document.',
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'The ID of the document to write.',
    }),
    content: Schema.String.annotations({
      description: 'New content to write to the document.',
    }),
  }),
  outputSchema: Schema.Void,
  handler: Effect.fn(function* ({ data: { id, content } }) {
    const doc = yield* DatabaseService.resolve(ArtifactId.toDXN(id), Markdown.Document);
    const text = yield* DatabaseService.load(doc.content);
    text.content = content;
  }),
});
