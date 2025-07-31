//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo-schema';
import { DataType } from '@dxos/schema';

export namespace Markdown {
  export const Document = Schema.Struct({
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

  export type Document = Schema.Schema.Type<typeof Document>;

  export const makeDocument = ({
    content = '',
    ...props
  }: Partial<{ name: string; fallbackName: string; content: string }> = {}) =>
    Obj.make(Document, { ...props, content: Ref.make(DataType.makeText(content)) });
}

/**
 * Checks if an object conforms to the interface needed to render an editor.
 * @deprecated Use Schema.instanceOf(Markdown.Document, data)
 */
// TODO(burdon): Normalize types (from FilesPlugin).
export const isEditorModel = (data: any): data is { id: string; text: string } =>
  data &&
  typeof data === 'object' &&
  'id' in data &&
  typeof data.id === 'string' &&
  'text' in data &&
  typeof data.text === 'string';
