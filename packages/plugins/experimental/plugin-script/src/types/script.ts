//
// Copyright 2024 DXOS.org
//

import { ref, S, TypedObject } from '@dxos/echo-schema';
import { TextType } from '@dxos/plugin-markdown/types';

// TODO(burdon): Which is the outer type? I.e., in the navbar?

/**
 * Source script.
 */
export class ScriptType extends TypedObject({ typename: 'dxos.org/type/Script', version: '0.1.0' })({
  // TODO(burdon): Change to URI?
  name: S.optional(S.String),
  description: S.optional(S.String),
  source: ref(TextType),
  // TODO(burdon): Change to has of deployed content.
  // Whether source has changed since last deploy.
  changed: S.optional(S.Boolean),
}) {}

/**
 * Function deployment.
 */
export class FunctionType extends TypedObject({ typename: 'dxos.org/type/Function', version: '0.1.0' })({
  name: S.optional(S.String),
  version: S.Number,
  // Local binding to a function name.
  // TODO(burdon): Move binding to inner type.
  binding: S.optional(S.String),
  // Reference to a source script if it exists within ECHO.
  source: S.optional(ref(ScriptType)),
}) {}
