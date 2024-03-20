//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';
import { EchoObjectSchema } from '@dxos/echo-schema';

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

export class ChainInput extends EchoObjectSchema({ typename: 'braneframe.Chain.Input', version: '0.1.0' })({
  name: S.string,
  type: S.enums(ChainInputType),
  value: S.string,
}) {}

export class ChainPromptType extends EchoObjectSchema({ typename: 'braneframe.Chain.Prompt', version: '0.1.0' })({
  command: S.string,
  source: E.ref(TextV0Type),
  inputs: S.array(E.ref(ChainInput)),
}) {}

export class ChainType extends EchoObjectSchema({ typename: 'braneframe.Chain', version: '0.1.0' })({
  title: S.string,
  prompts: S.array(E.ref(ChainPromptType)),
}) {}
