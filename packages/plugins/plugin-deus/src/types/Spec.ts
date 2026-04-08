//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { Text } from '@dxos/schema';

import { meta } from '../meta';

export const Spec = Schema.Struct({
  name: Schema.optional(Schema.String),
  content: Ref.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'org.dxos.plugin.deus.spec',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: meta.icon!,
    hue: meta.iconHue,
  }),
);

export interface Spec extends Schema.Schema.Type<typeof Spec> {}

export const isSpec = (object: unknown): object is Spec => Schema.is(Spec)(object);

export const make = ({ content = '', ...props }: Partial<{ name: string; content: string }> = {}) => {
  const spec = Obj.make(Spec, { ...props, content: Ref.make(Text.make({ content })) });
  Obj.setParent(spec.content.target!, spec);
  return spec;
};
