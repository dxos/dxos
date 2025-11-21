//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';
import { Text } from '@dxos/schema';

export const Outline = Schema.Struct({
  name: Schema.optional(Schema.String),
  content: Type.Ref(Text.Text),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Outline',
    version: '0.2.0',
  }),
);

export interface Outline extends Schema.Schema.Type<typeof Outline> {}

export const make = ({ name, content }: { name?: string; content?: string } = {}): Outline => {
  return Obj.make(Outline, {
    name,
    content: Ref.make(Text.make(content)),
  });
};
