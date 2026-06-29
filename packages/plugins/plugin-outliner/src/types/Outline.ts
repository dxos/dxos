//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { CollectionItemAnnotation, Text } from '@dxos/schema';

export class Outline extends Type.makeObject<Outline>(DXN.make('org.dxos.type.outline', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    content: Ref.Ref(Text.Text),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--tree-structure--regular', hue: 'indigo' }),
    CollectionItemAnnotation.set(true),
  ),
) {}

export const make = ({ name, content }: { name?: string; content?: string } = {}): Outline => {
  return Obj.make(Outline, {
    name,
    content: Ref.make(Text.make({ content })),
  });
};
