//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Type } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { Markdown } from '@dxos/plugin-markdown/types';

export default defineFunction({
  key: 'dxos.org/function/markdown/read',
  name: 'Read markdown document',
  description:
    'Read markdown document. Note that result is a snapshot in time, and might have changed since the document was last read.',
  inputSchema: Schema.Struct({
    document: Type.Ref(Markdown.Document).annotations({
      description: 'The document to read.',
    }),
  }),
  outputSchema: Schema.Struct({
    content: Schema.String,
  }),
  handler: Effect.fn(function* ({ data: { document } }) {
    const { content } = yield* document.pipe(
      Database.load,
      Effect.flatMap((doc) => doc.content.pipe(Database.load)),
    );
    return { content };
  }),
});
