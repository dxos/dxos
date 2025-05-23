//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { Expando, LabelAnnotationId, Ref } from '@dxos/echo-schema';
import { makeRef, live } from '@dxos/live-object';
import { ThreadType } from '@dxos/plugin-space/types';
import { DataType } from '@dxos/schema';

export const DocumentSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  fallbackName: Schema.optional(Schema.String),
  content: Ref(DataType.Text),
  threads: Schema.mutable(Schema.Array(Ref(ThreadType))),
  assistantChatQueue: Schema.optional(Ref(Expando)),
}).annotations({
  // TODO(dmaretskyi): `Schema.Struct(...).pipe(defaultLabel(['name', 'fallbackName']))` for type-safe annotations.
  [LabelAnnotationId]: ['name', 'fallbackName'],
});

export const DocumentType = DocumentSchema.pipe(
  Type.def({
    typename: 'dxos.org/type/Document',
    version: '0.1.0',
  }),
);
export type DocumentType = Schema.Schema.Type<typeof DocumentType>;

// TODO(burdon): Replace when defaults are supported.
export const createDocument = ({ name, content }: { name: string; content: string }) =>
  live(DocumentType, { name, content: makeRef(live(DataType.Text, { content })), threads: [] });

/**
 * Checks if an object conforms to the interface needed to render an editor.
 */
// TODO(burdon): Normalize types (from FilesPlugin).
export const isEditorModel = (data: any): data is { id: string; text: string } =>
  data &&
  typeof data === 'object' &&
  'id' in data &&
  typeof data.id === 'string' &&
  'text' in data &&
  typeof data.text === 'string';
