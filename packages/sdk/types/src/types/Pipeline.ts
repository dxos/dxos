//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { FormInputAnnotation, Format, GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { IconAnnotation, View } from '@dxos/schema';

export const Column = Schema.Struct({
  name: Schema.String,
  view: Type.Ref(View.View),
  order: Schema.Array(Schema.String),
});

export type Column = Schema.Schema.Type<typeof Column>;

// TODO(wittjosiah): Move to plugin-pipeline. This isn't a common type.
export const Pipeline = Schema.Struct({
  name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName'), Schema.optional),
  description: Schema.String.pipe(Schema.optional),
  image: Format.URL.pipe(Schema.annotations({ title: 'Image' }), Schema.optional),
  columns: Schema.Array(Column).pipe(FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'dxos.org/type/Pipeline',
    version: '0.2.0',
  }),
  Schema.annotations({ title: 'Pipeline' }),
  LabelAnnotation.set(['name']),
  IconAnnotation.set('ph--path--regular'),
);

export type Pipeline = Schema.Schema.Type<typeof Pipeline>;

export const make = (props: Partial<Obj.MakeProps<typeof Pipeline>> = {}): Pipeline =>
  Obj.make(Pipeline, {
    columns: [],
    ...props,
  });
