//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';

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
export const Input = Schema.Struct({
  name: Schema.String,
  kind: Schema.optional(InputKind),
  default: Schema.optional(Schema.Any),

  /**
   * Function to call if the kind is 'function'.
   */
  function: Schema.optional(Schema.String),
});

export type Input = Schema.Schema.Type<typeof Input>;

/**
 * Template type.
 */
export const Template = Schema.Struct({
  source: Ref.Ref(Text.Text).annotations({ description: 'Handlebars template source' }),
  inputs: Schema.optional(Schema.Array(Input)),
});

export interface Template extends Schema.Schema.Type<typeof Template> {}

export const make = ({
  id,
  source,
  inputs = [],
}: { id?: string; source?: string; inputs?: Input[] } = {}): Template => ({
  source: Ref.make(Text.make({ id, content: source })),
  inputs,
});
