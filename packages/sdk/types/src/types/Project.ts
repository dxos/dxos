//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj } from '@dxos/echo';
import { Type } from '@dxos/echo';
import { Format, GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { IconAnnotation, View } from '@dxos/schema';

export const Lane = Schema.Struct({
  name: Schema.String,
  view: Type.Ref(View.View),
  order: Schema.Array(Schema.String),
});

export type Lane = Schema.Schema.Type<typeof Lane>;

export const Project = Schema.Struct({
  name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName'), Schema.optional),
  description: Schema.String.pipe(Schema.optional),
  image: Format.URL.pipe(Schema.annotations({ title: 'Image' }), Schema.optional),
  lanes: Schema.Array(Lane).pipe(Schema.mutable),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Project',
    version: '0.1.0',
  }),
  Schema.annotations({ title: 'Project' }),
  LabelAnnotation.set(['name']),
  IconAnnotation.set('ph--check-square-offset--regular'),
);

export interface Project extends Schema.Schema.Type<typeof Project> {}

export const make = (props: Partial<Obj.MakeProps<typeof Project>> = {}) =>
  Obj.make(Project, {
    lanes: [],
    ...props,
  });
