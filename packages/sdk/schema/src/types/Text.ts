//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj } from '@dxos/echo';
import { Type } from '@dxos/echo';

export const Text = Schema.Struct({
  name: Schema.optional(Schema.String),
  content: Schema.String,
}).pipe(
  Type.object({
    typename: 'org.dxos.type.text',
    version: '0.1.0',
  }),
  Annotation.LabelAnnotation.set(['name']),
  Annotation.SystemTypeAnnotation.set(true),
  Annotation.IconAnnotation.set({
    icon: 'ph--text-t--regular',
    hue: 'green',
  }),
);

export interface Text extends Schema.Schema.Type<typeof Text> {}

export const make = (
  propsOrContent: Partial<{ id: string; name: string; content: string }> | string = {},
) => {
  const props = typeof propsOrContent === 'string' ? { content: propsOrContent } : propsOrContent;
  return Obj.make(Text, { id: props.id, name: props.name, content: props.content ?? '' });
};
