//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { ArtifactId } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { DatabaseService, defineFunction } from '@dxos/functions';
import { DocumentType } from '@dxos/plugin-markdown/types';

export default defineFunction({
  name: 'dxos.org/function/markdown/write-document',
  description: 'Updates the entire contents of the document.',
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({ description: 'The ID of the document to write.' }),
    content: Schema.String.annotations({ description: 'New content to write to the document.' }),
  }),
  outputSchema: Schema.String,
  handler: Effect.fn(function* ({ data: { id, content } }) {
    const doc = yield* DatabaseService.resolve(ArtifactId.toDXN(id));
    if (!doc || !Obj.instanceOf(DocumentType, doc)) {
      throw new Error('Document not found.');
    }

    const text = yield* DatabaseService.loadRef(doc.content);
    text.content = content;

    // eslint-disable-next-line no-console
    console.log('writeDocument', content);
    return 'Document updated.';
  }),
});
