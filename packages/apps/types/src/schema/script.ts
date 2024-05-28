//
// Copyright 2024 DXOS.org
//

import { ref, S, TypedObject } from '@dxos/echo-schema';

import { TextV0Type } from './document';

export class ScriptType extends TypedObject({ typename: 'dxos.org/type/Script', version: '0.1.0' })({
  title: S.optional(S.string),
  source: ref(TextV0Type),
}) {}
