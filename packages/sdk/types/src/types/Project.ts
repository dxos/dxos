//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj } from '@dxos/echo';
import { Type } from '@dxos/echo';
<<<<<<< HEAD
import { Format } from '@dxos/echo/internal';
import { Collection, IconAnnotation, ItemAnnotation, View } from '@dxos/schema';
||||||| 87517e966b
import { Format, GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { Collection, IconAnnotation, ItemAnnotation, View } from '@dxos/schema';
=======
import { FormInputAnnotation, Format, GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { IconAnnotation, View } from '@dxos/schema';

export const Column = Schema.Struct({
  name: Schema.String,
  view: Type.Ref(View.View),
  order: Schema.Array(Schema.String),
});

export type Column = Schema.Schema.Type<typeof Column>;
>>>>>>> main

export const Project = Schema.Struct({
  name: Schema.String.pipe(Annotation.GeneratorAnnotation.set('commerce.productName'), Schema.optional),
  description: Schema.String.pipe(Schema.optional),
  image: Format.URL.pipe(Schema.annotations({ title: 'Image' }), Schema.optional),
  columns: Schema.Array(Column.pipe(Schema.mutable)).pipe(Schema.mutable, FormInputAnnotation.set(false)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Project',
    version: '0.2.0',
  }),
  Schema.annotations({ title: 'Project' }),
<<<<<<< HEAD
  Annotation.LabelAnnotation.set(['name']),
  ItemAnnotation.set(true),
||||||| 87517e966b
  LabelAnnotation.set(['name']),
  ItemAnnotation.set(true),
=======
  LabelAnnotation.set(['name']),
>>>>>>> main
  IconAnnotation.set('ph--check-square-offset--regular'),
);

export interface Project extends Schema.Schema.Type<typeof Project> {}

export const make = (props: Partial<Obj.MakeProps<typeof Project>> = {}) =>
  Obj.make(Project, {
    columns: [],
    ...props,
  });
