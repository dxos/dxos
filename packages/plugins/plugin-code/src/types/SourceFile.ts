//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { Text } from '@dxos/schema';

import { meta } from '../meta';

export const SourceFile = Schema.Struct({
  path: Schema.String,
  content: Ref.Ref(Text.Text),
  mode: Schema.optional(Schema.Number),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.sourceFile',
    version: '0.1.0',
  }),
  Annotation.LabelAnnotation.set(['path']),
  Annotation.IconAnnotation.set({
    icon: 'ph--file-code--regular',
    hue: meta.iconHue,
  }),
);

export interface SourceFile extends Schema.Schema.Type<typeof SourceFile> {}

export const isSourceFile = (object: unknown): object is SourceFile => Schema.is(SourceFile)(object);

export const make = ({ path, content = '', mode }: { path: string; content?: string; mode?: number }) => {
  const file = Obj.make(SourceFile, {
    path,
    content: Ref.make(Text.make({ content })),
    ...(mode !== undefined ? { mode } : {}),
  });
  Obj.setParent(file.content.target!, file);
  return file;
};
