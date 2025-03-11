//
// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';

// TODO(burdon): Change to S.Literal (and discriminated union).
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

export const TemplateInputSchema = S.mutable(
  S.Struct({
    name: S.String,
    type: S.optional(S.Enums(TemplateInputType)),
    value: S.optional(S.String),
  }),
);

export type TemplateInput = S.Schema.Type<typeof TemplateInputSchema>;

export class TemplateType extends TypedObject({ typename: 'dxos.org/type/Template', version: '0.1.0' })({
  name: S.optional(S.String),
  source: S.String,
  inputs: S.optional(S.mutable(S.Array(TemplateInputSchema))),
  command: S.optional(S.String),
}) {}
