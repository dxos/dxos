//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { ArtifactId } from '@dxos/artifact';
import { Obj } from '@dxos/echo';
import { DatabaseService, defineFunction } from '@dxos/functions';
import { DocumentType } from '@dxos/plugin-markdown/types';

export default defineFunction({
  name: 'dxos.org/function/markdown/writeDocument',
  description: 'Write the design spec document.',
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

    const contentDoc = yield* DatabaseService.loadRef(doc.content);
    contentDoc.content = content;

    // eslint-disable-next-line no-console
    console.log('writeDocument', content);
    return 'Document updated.';
  }),
});
