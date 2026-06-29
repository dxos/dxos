//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';

export class Text extends Type.makeObject<Text>(DXN.make('org.dxos.type.text', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    content: Schema.String,
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.HiddenAnnotation.set(true),
    Annotation.IconAnnotation.set({ icon: 'ph--text-t--regular', hue: 'green' }),
  ),
) {}

export type MakeProps = Partial<{ id: string; name: string; content: string }>;

export const make = (props: MakeProps = {}) =>
  Obj.make(Text, { id: props.id, name: props.name, content: props.content ?? '' });
