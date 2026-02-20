//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Obj, Type } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { Markdown } from '@dxos/plugin-markdown/types';

export default defineFunction({
  key: 'dxos.org/function/markdown/update',
  name: 'Update markdown',
  description: 'Updates the entire contents of the markdown document.',
  inputSchema: Schema.Struct({
    doc: Type.Ref(Markdown.Document).annotations({
      description: 'The ID of the document to write.',
    }),
    content: Schema.String.annotations({
      description: 'New content to write to the document.',
    }),
  }),
  outputSchema: Schema.Void,
  handler: Effect.fn(function* ({ data: { doc, content } }) {
    const document = yield* Database.load(doc);
    const text = yield* Database.load(document.content);
    Obj.change(text, (t) => {
      t.content = content;
    });
  }),
});
