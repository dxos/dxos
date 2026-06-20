//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type, View } from '@dxos/echo';
import { FormInputAnnotation, GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Format } from '@dxos/echo/Format';

export const Column = Schema.Struct({
  name: Schema.String,
  order: Schema.Array(Schema.String),
  view: Ref.Ref(View.View),
});

export type Column = Schema.Schema.Type<typeof Column>;

export const Pipeline = Schema.Struct({
  name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName'), Schema.optional),
  description: Schema.String.pipe(Schema.optional),
  image: Format.URL.pipe(Schema.annotations({ title: 'Image' }), Schema.optional),
  columns: Schema.Array(Column).pipe(FormInputAnnotation.set(false)),
}).pipe(
  Schema.annotations({ title: 'Pipeline' }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--path--regular', hue: 'purple' }),
  Type.makeObject(DXN.make('org.dxos.type.pipeline', '0.1.0')),
);

export type Pipeline = Type.InstanceType<typeof Pipeline>;

export const make = (props: Partial<Obj.MakeProps<typeof Pipeline>> = {}): Pipeline =>
  Obj.make(Pipeline, {
    columns: [],
    ...props,
  });
