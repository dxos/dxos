//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Type } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';

import { Markdown } from '../../types';

export default defineFunction({
  key: 'dxos.org/function/markdown/open',
  name: 'Open',
  description: 'Opens and reads the contents of a new markdown document.',
  inputSchema: Schema.Struct({
    doc: Type.Ref(Markdown.Document).annotations({
      description: 'The ID of the markdown document.',
    }),
  }),
  outputSchema: Schema.Struct({
    content: Schema.String,
  }),
  handler: Effect.fn(function* ({ data: { doc } }) {
    const { content } = yield* doc.pipe(
      Database.load,
      Effect.map((_) => _.content),
      Effect.flatMap(Database.load),
    );
    return { content };
  }),
});
