//
// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';
import * as E from '@dxos/echo-schema';

import { TextV0Type } from './document';

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

export class ChainInput extends TypedObject({ typename: 'braneframe.Chain.Input', version: '0.1.0' })({
  name: S.string,
  type: S.optional(S.enums(ChainInputType)),
  value: S.optional(S.string),
}) {}

export class ChainPromptType extends TypedObject({ typename: 'braneframe.Chain.Prompt', version: '0.1.0' })({
  command: S.string,
  source: E.ref(TextV0Type),
  inputs: S.mutable(E.refArray(ChainInput)),
}) {}

export class ChainType extends TypedObject({ typename: 'braneframe.Chain', version: '0.1.0' })({
  title: S.optional(S.string),
  prompts: S.mutable(E.refArray(ChainPromptType)),
}) {}
