//
// Copyright 2024 DXOS.org
//

import { JsonSchemaType, ref, S, TypedObject } from '@dxos/echo-schema';
import { TextType } from '@dxos/plugin-markdown/types';

/**
 * Source script.
 */
export class ScriptType extends TypedObject({
  typename: 'dxos.org/type/Script',
  version: '0.1.0',
})({
  // TODO(burdon): Change to URI?
  name: S.optional(S.String),
  description: S.optional(S.String),
  source: ref(TextType),
  // TODO(burdon): Change to hash of deployed content.
  // Whether source has changed since last deploy.
  changed: S.optional(S.Boolean),
}) {}

/**
 * Function deployment.
 */
export class FunctionType extends TypedObject({
  typename: 'dxos.org/type/Function',
  version: '0.1.0',
})({
  // TODO(burdon): Change to id?
  name: S.optional(S.String),
  version: S.Number,
  // Local binding to a function name.
  // TODO(burdon): Move binding to inner type.
  binding: S.optional(S.String),
  // Reference to a source script if it exists within ECHO.
  source: S.optional(ref(ScriptType)),
  inputSchema: S.optional(JsonSchemaType),
}) {}
