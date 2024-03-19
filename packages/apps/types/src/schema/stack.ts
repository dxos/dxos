//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';

const _SectionSchema = S.struct({
  object: E.ref(E.AnyEchoObject),
}).pipe(E.echoObject('braneframe.Stack.Section', '0.1.0'));
export interface SectionType extends E.ObjectType<typeof _SectionSchema> {}
export const SectionSchema: S.Schema<SectionType> = _SectionSchema;

const _StackSchema = S.struct({
  title: S.string,
  sections: S.array(E.ref(SectionSchema)),
}).pipe(E.echoObject('braneframe.Stack', '0.1.0'));
export interface StackType extends E.ObjectType<typeof _StackSchema> {}
export const StackSchema: S.Schema<StackType> = _StackSchema;

export const isStack = (data: unknown): data is StackType => !!data && E.getSchema(data) === StackSchema;
