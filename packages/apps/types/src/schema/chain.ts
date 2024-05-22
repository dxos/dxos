//
// Copyright 2024 DXOS.org
//

import { ref, S, TypedObject } from '@dxos/echo-schema';

// TODO(burdon): Change to S.literal (and discriminated union).
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
  S.struct({
    name: S.string,
    type: S.optional(S.enums(ChainInputType)),
    value: S.optional(S.string),
  }),
);

export type ChainInput = S.Schema.Type<typeof ChainInputSchema>;

export class ChainPromptType extends TypedObject({ typename: 'dxos.org/type/ChainPrompt', version: '0.1.0' })({
  command: S.optional(S.string),
  source: S.string,
  inputs: S.optional(S.mutable(S.array(ChainInputSchema))),
}) {}

export class ChainType extends TypedObject({ typename: 'dxos.org/type/Chain', version: '0.1.0' })({
  title: S.optional(S.string),
  prompts: S.optional(S.mutable(S.array(ref(ChainPromptType)))),
}) {}
