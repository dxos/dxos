//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj } from '@dxos/echo';
import { Type } from '@dxos/echo';

export const Text = Schema.Struct({
  content: Schema.String,
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Text',
    version: '0.1.0',
  }),
  Annotation.SystemTypeAnnotation.set(true),
);

export interface Text extends Schema.Schema.Type<typeof Text> {}

// TODO(burdon): Remove id property.
export const make = (content = '', id?: Obj.ID) => Obj.make(Text, { id, content });
