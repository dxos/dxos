//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo-schema';
import { DataType } from '@dxos/schema';

export namespace Template {
  // TODO(burdon): Change to Schema.Literal (and discriminated union).
  export enum InputType {
    VALUE = 0,
    PASS_THROUGH = 1,
    RETRIEVER = 2,
    FUNCTION = 3,
    QUERY = 4,
    RESOLVER = 5,
    CONTEXT = 6,
    SCHEMA = 7,
  }

  export const InputSchema = Schema.mutable(
    Schema.Struct({
      name: Schema.String,
      type: Schema.optional(Schema.Enums(InputType)),
      value: Schema.optional(Schema.String),
    }),
  );

  export type Input = Schema.Schema.Type<typeof InputSchema>;

  // export const TemplateKinds = ['always', 'schema-matching', 'automatically', 'manual'] as const;
  // export type TemplateKind = (typeof TemplateKinds)[number];

  // export const TemplateKindSchema = Schema.Union(
  //   Schema.Struct({
  //     include: Schema.Literal('always'),
  //   }),
  //   Schema.Struct({
  //     include: Schema.Literal('schema-matching'),
  //     typename: Schema.String,
  //   }),
  //   Schema.Struct({
  //     include: Schema.Literal('automatically'),
  //     description: Schema.String,
  //   }),
  //   Schema.Struct({
  //     include: Schema.Literal('manual'),
  //   }),
  // );

  // export type TemplateKindType = Schema.Schema.Type<typeof TemplateKindSchema>;

  export const Template = Schema.Struct({
    name: Schema.optional(Schema.String),
    // kind: Schema.mutable(TemplateKindSchema),
    source: Type.Ref(DataType.Text),
    inputs: Schema.optional(Schema.mutable(Schema.Array(InputSchema))),
    // command: Schema.optional(Schema.String),
  }).pipe(
    LabelAnnotation.set(['name']),
    Type.Obj({
      typename: 'dxos.org/type/Template',
      version: '0.1.0',
    }),
  );

  export interface Template extends Schema.Schema.Type<typeof Template> {}

  export const make = ({ source = '', ...props }: Partial<Omit<Template, 'source'> & { source: string }>) => {
    return Obj.make(Template, {
      source: Ref.make(Obj.make(DataType.Text, { content: source })),
      ...props,
    });
  };
}
