//
// Copyright 2024 DXOS.org
//

import { EchoObject, JsonSchemaType, LabelAnnotationId, Ref, S, TypedObject } from '@dxos/echo-schema';
import { DataType } from '@dxos/schema';

/**
 * Source script.
 */
export const ScriptType = S.Struct({
  name: S.optional(S.String),
  description: S.optional(S.String),
  // TODO(burdon): Change to hash of deployed content.
  // Whether source has changed since last deploy.
  changed: S.optional(S.Boolean),
  source: Ref(DataType.Text),
})
  .annotations({ [LabelAnnotationId]: 'name' })
  .pipe(EchoObject({ typename: 'dxos.org/type/Script', version: '0.1.0' }));

export type ScriptType = S.Schema.Type<typeof ScriptType>;

/**
 * Function deployment.
 */
export class FunctionType extends TypedObject({
  typename: 'dxos.org/type/Function',
  version: '0.1.0',
})({
  // TODO(burdon): Rename to id/uri?
  name: S.NonEmptyString,
  version: S.String,

  description: S.optional(S.String),

  // Reference to a source script if it exists within ECHO.
  // TODO(burdon): Don't ref ScriptType directly (core).
  source: S.optional(Ref(ScriptType)),

  inputSchema: S.optional(JsonSchemaType),
  outputSchema: S.optional(JsonSchemaType),

  // Local binding to a function name.
  binding: S.optional(S.String),
}) {}
