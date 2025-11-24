//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

<<<<<<< HEAD
import { Annotation, Obj, Ref, Type } from '@dxos/echo';
||||||| 87517e966b
import { Obj, Ref, Type } from '@dxos/echo';
import { DescriptionAnnotation, FormAnnotation, LabelAnnotation } from '@dxos/echo/internal';
=======
import { Obj, Ref, Type } from '@dxos/echo';
import { DescriptionAnnotation, FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
>>>>>>> origin/main
import { EditorInputMode, EditorViewMode } from '@dxos/react-ui-editor/types';
import { Text } from '@dxos/schema';

/**
 * Document Item type.
 */
export const Document = Schema.Struct({
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
<<<<<<< HEAD
  fallbackName: Schema.String.pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
  content: Type.Ref(Text.Text).pipe(Annotation.FormInputAnnotation.set(false)),
||||||| 87517e966b
  fallbackName: Schema.String.pipe(FormAnnotation.set(false), Schema.optional),
  content: Type.Ref(Text.Text).pipe(FormAnnotation.set(false)),
=======
  fallbackName: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
  content: Type.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),
>>>>>>> origin/main
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Document',
    version: '0.1.0',
  }),
<<<<<<< HEAD
  Annotation.LabelAnnotation.set(['name', 'fallbackName']),
  Annotation.DescriptionAnnotation.set('description'),
||||||| 87517e966b
  LabelAnnotation.set(['name', 'fallbackName']),
  DescriptionAnnotation.set('description'),
  ItemAnnotation.set(true),
=======
  LabelAnnotation.set(['name', 'fallbackName']),
  DescriptionAnnotation.set('description'),
>>>>>>> origin/main
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
