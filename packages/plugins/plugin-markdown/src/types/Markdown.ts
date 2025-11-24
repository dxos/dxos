//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { EditorInputMode, EditorViewMode } from '@dxos/react-ui-editor/types';
import { Text } from '@dxos/schema';

/**
 * Document Item type.
 */
export const Document = Schema.Struct({
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  fallbackName: Schema.String.pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
  content: Type.Ref(Text.Text).pipe(Annotation.FormInputAnnotation.set(false)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Document',
    version: '0.1.0',
  }),
  Annotation.LabelAnnotation.set(['name', 'fallbackName']),
  Annotation.DescriptionAnnotation.set('description'),
);

export type Document = Schema.Schema.Type<typeof Document>;

/**
 * Document factory.
 */
export const make = ({
  content = '',
  ...props
}: Partial<{ name: string; fallbackName: string; content: string }> = {}) =>
  Obj.make(Document, { ...props, content: Ref.make(Text.make(content)) });

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
