//
// Copyright 2024 DXOS.org
//

import { ref, S, TypedObject } from '@dxos/echo-schema';
import { TextType } from '@dxos/plugin-markdown/types';

export class ScriptType extends TypedObject({ typename: 'dxos.org/type/Script', version: '0.1.0' })({
  name: S.optional(S.String),
  source: ref(TextType),
  // Whether source has changed since last deploy.
  changed: S.optional(S.Boolean),
}) {}

export class FunctionType extends TypedObject({ typename: 'dxos.org/type/Function', version: '0.1.0' })({
  version: S.Number,
  // Local binding to a function name.
  binding: S.optional(S.String),
  // Reference to a source script if it exists within ECHO.
  source: S.optional(ref(ScriptType)),
}) {}
