//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { defineFunction } from '@dxos/functions';

export default defineFunction({
  key: 'example.com/function/test',
  name: 'Test',
  description: 'Test.',
  inputSchema: Schema.Struct({
    // id: ArtifactId.annotations({
    //   description: 'Document ID.',
    // }),
  }),
  outputSchema: Schema.Struct({
    content: Schema.String,
  }),
  handler: Effect.fn(function* () {
    // const doc = yield* Database.Service.resolve(ArtifactId.toDXN(id), Markdown.Document);
    // const { content } = yield* Database.Service.load(doc.content);
    // return { content };
    return { content: 'hello' };
  }),
});
