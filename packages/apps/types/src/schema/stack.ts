//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';
import { EchoObjectSchema } from '@dxos/echo-schema';

export class SectionType extends EchoObjectSchema({ typename: 'braneframe.Stack.Section', version: '0.1.0' })({
  object: E.ref(E.AnyEchoObject),
}) {}

export class StackType extends EchoObjectSchema({ typename: 'braneframe.Stack', version: '0.1.0' })({
  title: S.optional(S.string),
  sections: S.mutable(S.array(E.ref(SectionType))),
}) {}
