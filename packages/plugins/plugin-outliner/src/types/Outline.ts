//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { Text } from '@dxos/schema';

export const Outline = Schema.Struct({
  name: Schema.optional(Schema.String),
  content: Ref.Ref(Text.Text),
}).pipe(
  Annotation.IconAnnotation.set({
    icon: 'ph--tree-structure--regular',
    hue: 'indigo',
  }),
  Type.makeObject(DXN.make('org.dxos.type.outline', '0.1.0')),
);

export type Outline = Type.InstanceType<typeof Outline>;

export const make = ({ name, content }: { name?: string; content?: string } = {}): Outline => {
  return Obj.make(Outline, {
    name,
    content: Ref.make(Text.make({ content })),
  });
};
