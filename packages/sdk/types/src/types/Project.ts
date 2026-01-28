//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Entity, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, Format, GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { IconAnnotation, View } from '@dxos/schema';

export type Column = {
  readonly name: string;
  readonly view: Ref.Ref<View.View>;
  readonly order: readonly string[];
};

export type ColumnEncoded = {
  readonly name: string;
  readonly view: string;
  readonly order: readonly string[];
};

const ColumnSchema = Schema.Struct({
  name: Schema.String,
  view: Type.Ref(View.View),
  order: Schema.Array(Schema.String),
});

export const Column: Schema.Schema<Column, ColumnEncoded> = ColumnSchema as any;

export interface Project extends Entity.OfKind<typeof Entity.Kind.Object> {
  readonly name?: string;
  readonly description?: string;
  readonly image?: string;
  readonly columns: Column[];
}

export type ProjectEncoded = {
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly image?: string;
  readonly columns: { readonly name: string; readonly view: string; readonly order: readonly string[] }[];
};

const ProjectSchema = Schema.Struct({
  name: Schema.String.pipe(GeneratorAnnotation.set('commerce.productName'), Schema.optional),
  description: Schema.String.pipe(Schema.optional),
  image: Format.URL.pipe(Schema.annotations({ title: 'Image' }), Schema.optional),
  columns: Schema.Array(Column.pipe(Schema.mutable)).pipe(Schema.mutable, FormInputAnnotation.set(false)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Project',
    version: '0.2.0',
  }),
  Schema.annotations({ title: 'Project' }),
  LabelAnnotation.set(['name']),
  IconAnnotation.set('ph--check-square-offset--regular'),
);

// Type annotation hides internal types while preserving brand properties.
export const Project: Type.Obj.Of<Schema.Schema<Project, ProjectEncoded>> = ProjectSchema as any;

export const make = (props: Partial<Obj.MakeProps<typeof Project>> = {}): Project =>
  Obj.make(Project, {
    columns: [],
    ...props,
  });
