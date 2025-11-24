//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { SystemTypeAnnotation } from '@dxos/echo/internal';
import { type ObjectId } from '@dxos/keys';

export const Text = Schema.Struct({
  content: Schema.String,
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Text',
    version: '0.1.0',
  }),
  SystemTypeAnnotation.set(true),
);

export interface Text extends Schema.Schema.Type<typeof Text> {}

export const make = (content = '', id?: ObjectId) => Obj.make(Text, { id, content });
