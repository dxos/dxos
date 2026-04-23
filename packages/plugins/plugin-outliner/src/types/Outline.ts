//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { Text } from '@dxos/schema';

export const Outline = Schema.Struct({
  name: Schema.optional(Schema.String),
  content: Ref.Ref(Text.Text),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.outline',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--tree-structure--regular',
    hue: 'indigo',
  }),
);

export interface Outline extends Schema.Schema.Type<typeof Outline> {}

export const make = ({ name, content }: { name?: string; content?: string } = {}): Outline => {
  return Obj.make(Outline, {
    name,
    content: Ref.make(Text.make({ content })),
  });
};
