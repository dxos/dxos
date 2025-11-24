//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Format, Obj } from '@dxos/echo';
import { Type } from '@dxos/echo';
import { IconAnnotation, View } from '@dxos/schema';

export const Column = Schema.Struct({
  name: Schema.String,
  view: Type.Ref(View.View),
  order: Schema.Array(Schema.String),
});

export type Column = Schema.Schema.Type<typeof Column>;

export const Project = Schema.Struct({
  name: Schema.String.pipe(Annotation.GeneratorAnnotation.set('commerce.productName'), Schema.optional),
  description: Schema.String.pipe(Schema.optional),
  image: Format.URL.pipe(Schema.annotations({ title: 'Image' }), Schema.optional),
  columns: Schema.Array(Column.pipe(Schema.mutable)).pipe(Schema.mutable, Annotation.FormInputAnnotation.set(false)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Project',
    version: '0.2.0',
  }),
  Schema.annotations({ title: 'Project' }),
  Annotation.LabelAnnotation.set(['name']),
  IconAnnotation.set('ph--check-square-offset--regular'),
);

export interface Project extends Schema.Schema.Type<typeof Project> {}

export const make = (props: Partial<Obj.MakeProps<typeof Project>> = {}) =>
  Obj.make(Project, {
    columns: [],
    ...props,
  });
