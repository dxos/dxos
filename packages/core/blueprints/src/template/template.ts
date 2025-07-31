//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Obj, Ref, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo-schema';
import { DataType } from '@dxos/schema';

/**
 * Template input kind determines how template variables are resolved.
 */
export const InputKind = Schema.Literal(
  'value', // Literal value.
  'pass-through',
  'retriever',
  'function',
  'query',
  'resolver',
  'context',
  'schema',
);

export type InputKind = Schema.Schema.Type<typeof InputKind>;

/**
 * Template input variable.
 * E.g., {{foo}}
 */
export const Input = Schema.mutable(
  Schema.Struct({
    name: Schema.String,
    kind: Schema.optional(InputKind),
    default: Schema.optional(Schema.Any),
  }),
);

export type Input = Schema.Schema.Type<typeof Input>;

/**
 * Template type.
 */
export const Template = Schema.Struct({
  name: Schema.optional(Schema.String),
  source: Type.Ref(DataType.Text).annotations({ description: 'Handlebars template source' }),
  inputs: Schema.optional(Schema.mutable(Schema.Array(Input))),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Template',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
);

export interface Template extends Schema.Schema.Type<typeof Template> {}

/**
 * Creates a template.
 */
export const make = ({ source = '', ...props }: Partial<Omit<Template, 'source'> & { source: string }>) => {
  return Obj.make(Template, {
    source: Ref.make(DataType.text(source)),
    ...props,
  });
};
