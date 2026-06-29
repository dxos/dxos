//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { Text } from '@dxos/schema';

import { meta } from '../meta';

export class SourceFile extends Type.makeObject<SourceFile>(DXN.make('org.dxos.type.sourceFile', '0.1.0'))(
  Schema.Struct({
    path: Schema.String,
    content: Ref.Ref(Text.Text),
    mode: Schema.optional(Schema.Number),
  }).pipe(
    Annotation.LabelAnnotation.set(['path']),
    Annotation.IconAnnotation.set({ icon: 'ph--file-code--regular', hue: meta.profile.icon?.hue }),
  ),
) {}

export const isSourceFile = (object: unknown): object is SourceFile =>
  Schema.is(Type.getSchema(SourceFile) as Schema.Schema<SourceFile>)(object);

export const make = ({ path, content = '', mode }: { path: string; content?: string; mode?: number }) => {
  const file = Obj.make(SourceFile, {
    path,
    content: Ref.make(Text.make({ content })),
    ...(mode !== undefined ? { mode } : {}),
  });
  Obj.setParent(file.content.target!, file);
  return file;
};
