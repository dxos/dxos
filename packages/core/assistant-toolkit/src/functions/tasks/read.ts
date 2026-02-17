//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Type } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { Markdown } from '@dxos/plugin-markdown/types';

export default defineFunction({
  key: 'dxos.org/function/markdown/read-tasks',
  name: 'Read',
  description: 'Read markdown tasks.',
  inputSchema: Schema.Struct({
    doc: Type.Ref(Markdown.Document).annotations({
      description: 'The ID of the document to read.',
    }),
  }),
  outputSchema: Schema.Struct({
    content: Schema.String,
  }),
  handler: Effect.fn(function* ({ data: { doc } }) {
    const document = yield* Database.load(doc);

    // Return content with line numbers prefixed.
    const { content } = yield* Database.load(document.content);
    const lines = content.split('\n');
    const len = String(lines.length).length;
    const numbered = lines.map((line, i) => `${String(i + 1).padStart(len, ' ')}. ${line}`).join('\n');
    return { content: numbered };
  }),
});
