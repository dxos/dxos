//
// Copyright 2024 DXOS.org
//

import { ref, S, TypedObject } from '@dxos/echo-schema';

// TODO(burdon): Change to S.Literal (and discriminated union).
export enum ChainInputType {
  VALUE = 0,
  PASS_THROUGH = 1,
  RETRIEVER = 2,
  FUNCTION = 3,
  QUERY = 4,
  RESOLVER = 5,
  CONTEXT = 6,
  SCHEMA = 7,
}

export const ChainInputSchema = S.mutable(
  S.Struct({
    name: S.String,
    type: S.optional(S.Enums(ChainInputType)),
    value: S.optional(S.String),
  }),
);

export type ChainInput = S.Schema.Type<typeof ChainInputSchema>;

export class ChainPromptType extends TypedObject({ typename: 'dxos.org/type/ChainPrompt', version: '0.1.0' })({
  command: S.optional(S.String),
  template: S.String,
  inputs: S.optional(S.mutable(S.Array(ChainInputSchema))),
}) {}

export class ChainType extends TypedObject({ typename: 'dxos.org/type/Chain', version: '0.1.0' })({
  name: S.optional(S.String),
  prompts: S.optional(S.mutable(S.Array(ref(ChainPromptType)))),
}) {}
