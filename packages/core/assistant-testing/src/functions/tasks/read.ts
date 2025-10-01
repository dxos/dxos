//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { ArtifactId } from '@dxos/assistant';
import { DatabaseService, defineFunction } from '@dxos/functions';
import { Markdown } from '@dxos/plugin-markdown/types';

export default defineFunction({
  key: 'dxos.org/function/markdown/read-tasks',
  name: 'Read',
  description: 'Read markdown tasks.',
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'The ID of the document to read.',
    }),
  }),
  outputSchema: Schema.Struct({
    content: Schema.String,
  }),
  handler: Effect.fn(function* ({ data: { id } }) {
    const doc = yield* DatabaseService.resolve(ArtifactId.toDXN(id), Markdown.Document);

    // Return content with line numbers prefixed.
    const { content } = yield* DatabaseService.load(doc.content);
    const lines = content.split('\n');
    const len = String(lines.length).length;
    const numbered = lines.map((line, i) => `${String(i + 1).padStart(len, ' ')}. ${line}`).join('\n');
    return { content: numbered };
  }),
});
