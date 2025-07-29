//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { ArtifactId } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { DatabaseService, defineFunction } from '@dxos/functions';
import { DocumentType } from '@dxos/plugin-markdown/types';

export default defineFunction({
  name: 'dxos.org/function/markdown/read-document',
  description: 'Read the design spec document.',
  inputSchema: Schema.Struct({
    // TODO(dmaretskyi): Imagine if this could be an ECHO ref. (*_*)
    id: ArtifactId.annotations({ description: 'The ID of the document to read.' }),
  }),
  outputSchema: Schema.Struct({
    content: Schema.String,
  }),
  handler: Effect.fn(function* ({ data: { id } }) {
    const doc = yield* DatabaseService.resolve(ArtifactId.toDXN(id));
    if (!doc || !Obj.instanceOf(DocumentType, doc)) {
      throw new Error('Document not found.');
    }

    const { content } = yield* DatabaseService.loadRef(doc.content);
    return { content };
  }),
});
