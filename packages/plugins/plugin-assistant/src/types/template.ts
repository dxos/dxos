//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { TypedObject } from '@dxos/echo-schema';

// TODO(burdon): Change to Schema.Literal (and discriminated union).
export enum TemplateInputType {
  VALUE = 0,
  PASS_THROUGH = 1,
  RETRIEVER = 2,
  FUNCTION = 3,
  QUERY = 4,
  RESOLVER = 5,
  CONTEXT = 6,
  SCHEMA = 7,
}

export const TemplateInputSchema = Schema.mutable(
  Schema.Struct({
    name: Schema.String,
    type: Schema.optional(Schema.Enums(TemplateInputType)),
    value: Schema.optional(Schema.String),
  }),
);

export type TemplateInput = Schema.Schema.Type<typeof TemplateInputSchema>;

export const TemplateKinds = ['always', 'schema-matching', 'automatically', 'manual'] as const;
export type TemplateKind = (typeof TemplateKinds)[number];

export const TemplateKindSchema = Schema.Union(
  Schema.Struct({
    include: Schema.Literal('always'),
  }),
  Schema.Struct({
    include: Schema.Literal('schema-matching'),
    typename: Schema.String,
  }),
  Schema.Struct({
    include: Schema.Literal('automatically'),
    description: Schema.String,
  }),
  Schema.Struct({
    include: Schema.Literal('manual'),
  }),
);

export type TemplateKindType = Schema.Schema.Type<typeof TemplateKindSchema>;
export class TemplateType extends TypedObject({ typename: 'dxos.org/type/Template', version: '0.1.0' })({
  name: Schema.optional(Schema.String),
  kind: Schema.mutable(TemplateKindSchema),
  source: Schema.String,
  inputs: Schema.optional(Schema.mutable(Schema.Array(TemplateInputSchema))),
  command: Schema.optional(Schema.String),
}) {}
