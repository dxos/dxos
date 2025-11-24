//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

<<<<<<< HEAD
import { Annotation, Obj, Type } from '@dxos/echo';
||||||| 87517e966b
import { Obj, Type } from '@dxos/echo';
import { FormAnnotation } from '@dxos/echo/internal';
=======
import { Obj, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
>>>>>>> main

export const File = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
<<<<<<< HEAD
  type: Schema.String.pipe(Annotation.FormAnnotation.set(false)),
  cid: Schema.String.pipe(Annotation.FormAnnotation.set(false)),
  timestamp: Schema.String.pipe(Annotation.FormAnnotation.set(false), Schema.optional),
||||||| 87517e966b
  type: Schema.String.pipe(FormAnnotation.set(false)),
  cid: Schema.String.pipe(FormAnnotation.set(false)),
  timestamp: Schema.String.pipe(FormAnnotation.set(false), Schema.optional),
=======
  type: Schema.String.pipe(FormInputAnnotation.set(false)),
  cid: Schema.String.pipe(FormInputAnnotation.set(false)),
  timestamp: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
>>>>>>> main
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/File',
    version: '0.1.0',
  }),
);

export type File = Schema.Schema.Type<typeof File>;

export const make = (props: Obj.MakeProps<typeof File>) => Obj.make(File, props);
