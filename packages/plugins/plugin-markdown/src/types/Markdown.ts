//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo-schema';
import { EditorInputMode, EditorViewMode } from '@dxos/react-ui-editor/types';
import { DataType, ItemAnnotation } from '@dxos/schema';

/**
 * Document Item type.
 */
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
  ItemAnnotation.set(true),
);

export type Document = Schema.Schema.Type<typeof Document>;

/**
 * Document factory.
 */
export const makeDocument = ({
  content = '',
  ...props
}: Partial<{ name: string; fallbackName: string; content: string }> = {}) =>
  Obj.make(Document, { ...props, content: Ref.make(DataType.makeText(content)) });

/**
 * Plugin settings.
 */
export const Settings = Schema.mutable(
  Schema.Struct({
    defaultViewMode: EditorViewMode,
    editorInputMode: Schema.optional(EditorInputMode),
    experimental: Schema.optional(Schema.Boolean),
    debug: Schema.optional(Schema.Boolean),
    toolbar: Schema.optional(Schema.Boolean),
    typewriter: Schema.optional(Schema.String),
    // TODO(burdon): Per document settings.
    numberedHeadings: Schema.optional(Schema.Boolean),
    folding: Schema.optional(Schema.Boolean),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
