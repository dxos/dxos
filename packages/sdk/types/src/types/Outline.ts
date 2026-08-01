//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { CollectionItemAnnotation, Text } from '@dxos/schema';

import * as TaskSet from './TaskSet';

export class Outline extends Type.makeObject<Outline>(DXN.make('org.dxos.type.outline', '0.2.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    content: Ref.Ref(Text.Text),
    /** Owns the tasks converted from this outline's items; created lazily on the first conversion. */
    taskSet: Schema.optional(Ref.Ref(TaskSet.TaskSet)),
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
