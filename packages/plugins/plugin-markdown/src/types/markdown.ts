//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo-schema';
import { DataType } from '@dxos/schema';

export const DocumentType = Schema.Struct({
  name: Schema.optional(Schema.String),
  fallbackName: Schema.optional(Schema.String),
  content: Type.Ref(DataType.Text),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Document',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name', 'fallbackName']),
);

export type DocumentType = Schema.Schema.Type<typeof DocumentType>;

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

export namespace Markdown {
  export const Document = DocumentType;
  export type Document = DocumentType;

  // TODO(burdon): Use unifomly.
  export const make = ({ name, content = '' }: Partial<{ name: string; content: string }> = {}) =>
    // TODO(burdon): Use .text().
    Obj.make(Document, { name, content: Ref.make(Obj.make(DataType.Text, { content })) });
}
