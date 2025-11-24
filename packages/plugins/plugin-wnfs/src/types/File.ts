//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';

export const File = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  type: Schema.String.pipe(Annotation.FormInputAnnotation.set(false)),
  cid: Schema.String.pipe(Annotation.FormInputAnnotation.set(false)),
  timestamp: Schema.String.pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/File',
    version: '0.1.0',
  }),
);

export type File = Schema.Schema.Type<typeof File>;

export const make = (props: Obj.MakeProps<typeof File>) => Obj.make(File, props);
