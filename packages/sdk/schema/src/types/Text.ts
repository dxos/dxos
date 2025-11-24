//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

<<<<<<< HEAD
import { Obj, Type } from '@dxos/echo';
import { SystemTypeAnnotation } from '@dxos/echo/internal';
import { type ObjectId } from '@dxos/keys';
||||||| 87517e966b
import { Obj } from '@dxos/echo';
import { Type } from '@dxos/echo';
import { type ObjectId } from '@dxos/echo/internal';
=======
import { Obj } from '@dxos/echo';
import { Type } from '@dxos/echo';
import { type ObjectId, SystemTypeAnnotation } from '@dxos/echo/internal';
>>>>>>> origin/main

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
