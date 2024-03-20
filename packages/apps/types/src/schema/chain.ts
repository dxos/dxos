//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

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

const _ChainInput = S.struct({
  name: S.string,
  type: S.enums(ChainInputType),
  value: S.string,
}).pipe(E.echoObject('braneframe.Chain.Input', '0.1.0'));
export interface ChainInput extends E.ObjectType<typeof _ChainInput> {}
export const ChainInput: S.Schema<ChainInput> = _ChainInput;

const _ChainPromptSchema = S.struct({
  command: S.string,
  source: E.ref(TextV0Type),
  inputs: S.array(E.ref(_ChainInput)),
}).pipe(E.echoObject('braneframe.Chain.Prompt', '0.1.0'));
export interface ChainPromptType extends E.ObjectType<typeof _ChainPromptSchema> {}
export const ChainPromptSchema: S.Schema<ChainPromptType> = _ChainPromptSchema;

const _ChainSchema = S.struct({
  title: S.string,
  prompts: S.array(E.ref(_ChainPromptSchema)),
}).pipe(E.echoObject('braneframe.Chain', '0.1.0'));
export interface ChainType extends E.ObjectType<typeof _ChainSchema> {}
export const ChainSchema: S.Schema<ChainType> = _ChainSchema;
