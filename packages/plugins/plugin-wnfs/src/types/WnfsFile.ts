//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';

export const WnfsFile = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  type: Schema.String.pipe(FormInputAnnotation.set(false)),
  cid: Schema.String.pipe(FormInputAnnotation.set(false)),
  timestamp: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.file',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--file--regular',
    hue: 'teal',
  }),
);

export type WnfsFile = Schema.Schema.Type<typeof WnfsFile>;

export const make = (props: Obj.MakeProps<typeof WnfsFile>) => Obj.make(WnfsFile, props);
