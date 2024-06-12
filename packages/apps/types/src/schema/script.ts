//
// Copyright 2024 DXOS.org
//

import { ref, S, TypedObject } from '@dxos/echo-schema';

import { TextContent } from './document';

export class ScriptType extends TypedObject({ typename: 'dxos.org/type/Script', version: '0.1.0' })({
  name: S.optional(S.String),
  source: ref(TextContent),
}) {}
