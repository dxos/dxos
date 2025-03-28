//
// Copyright 2024 DXOS.org
//

import { EchoObject, LabelAnnotationId, Ref, S } from '@dxos/echo-schema';
import { ThreadType } from '@dxos/plugin-space/types';
import { TextType } from '@dxos/schema';

export const DocumentSchema = S.Struct({
  name: S.optional(S.String),
  fallbackName: S.optional(S.String),
  content: Ref(TextType),
  threads: S.mutable(S.Array(Ref(ThreadType))),
}).annotations({
  // TODO(dmaretskyi): `S.Struct(...).pipe(defaultLabel(['name', 'fallbackName']))` for type-safe annotations.
  [LabelAnnotationId]: ['name', 'fallbackName'],
});

export const DocumentType = DocumentSchema.pipe(EchoObject('dxos.org/type/Document', '0.1.0'));
export type DocumentType = S.Schema.Type<typeof DocumentType>;

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
