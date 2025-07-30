//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo-schema';
import { DataType } from '@dxos/schema';

export namespace Document {
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

  export const make = ({ name, content }: Partial<{ name: string; content: string }> = {}) =>
    Obj.make(Document, { name, content: Ref.make(DataType.text(content)) });
}
