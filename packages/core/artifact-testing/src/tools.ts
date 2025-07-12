//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { ArtifactId } from '@dxos/artifact';
import { Obj } from '@dxos/echo';
import { DatabaseService, defineFunction } from '@dxos/functions';

import { DocumentType } from '@dxos/plugin-markdown/types';
import { toolFromFunction } from './util';

export const readDocument = toolFromFunction(
  'test',
  'readDocument',
  defineFunction({
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
  }),
);

export const writeDocument = toolFromFunction(
  'test',
  'writeDocument',
  defineFunction({
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
  }),
);
