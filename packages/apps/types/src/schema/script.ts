//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';
import { EchoObjectSchema } from '@dxos/echo-schema';

import { TextV0Type } from './document';

export class ScriptType extends EchoObjectSchema({ typename: 'braneframe.Script', version: '0.1.0' })({
  title: S.optional(S.string),
  source: E.ref(TextV0Type),
}) {}
