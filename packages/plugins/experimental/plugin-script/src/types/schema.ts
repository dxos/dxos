//
// Copyright 2024 DXOS.org
//

import { JsonSchemaType, Ref, S, TypedObject } from '@dxos/echo-schema';
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
  // TODO(burdon): Change to hash of deployed content.
  // Whether source has changed since last deploy.
  changed: S.optional(S.Boolean),
  source: Ref(TextType),
}) {}

/**
 * Function deployment.
 */
// TODO(burdon): Move to core/functions.
export class FunctionType extends TypedObject({
  typename: 'dxos.org/type/Function',
  version: '0.1.0',
})({
  // TODO(burdon): Rename to id/uri?
  name: S.NonEmptyString,
  version: S.String,

  // Reference to a source script if it exists within ECHO.
  // TODO(burdon): Don't ref ScriptType directly (core).
  source: S.optional(Ref(ScriptType)),

  inputSchema: S.optional(JsonSchemaType),

  // Local binding to a function name.
  binding: S.optional(S.String),
}) {}
