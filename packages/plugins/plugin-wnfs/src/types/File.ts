//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { FormAnnotation } from '@dxos/echo/internal';

export const File = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  type: Schema.String.pipe(FormAnnotation.set(false)),
  cid: Schema.String.pipe(FormAnnotation.set(false)),
  timestamp: Schema.String.pipe(FormAnnotation.set(false), Schema.optional),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/File',
    version: '0.1.0',
  }),
);

export type File = Schema.Schema.Type<typeof File>;

export const make = (props: Obj.MakeProps<typeof File>) => Obj.make(File, props);
