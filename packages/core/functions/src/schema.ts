//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { EchoObject, JsonSchemaType, LabelAnnotation, Ref, TypedObject } from '@dxos/echo-schema';
import { DataType } from '@dxos/schema';

/**
 * Source script.
 */
export const ScriptType = Schema.Struct({
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  // TODO(burdon): Change to hash of deployed content.
  // Whether source has changed since last deploy.
  changed: Schema.optional(Schema.Boolean),
  source: Ref(DataType.Text),
}).pipe(
  EchoObject({
    typename: 'dxos.org/type/Script',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
);

export type ScriptType = Schema.Schema.Type<typeof ScriptType>;

/**
 * Function deployment.
 */
export class FunctionType extends TypedObject({
  typename: 'dxos.org/type/Function',
  version: '0.1.0',
})({
  // TODO(burdon): Rename to id/uri?
  name: Schema.NonEmptyString,
  version: Schema.String,

  description: Schema.optional(Schema.String),

  // Reference to a source script if it exists within ECHO.
  // TODO(burdon): Don't ref ScriptType directly (core).
  source: Schema.optional(Ref(ScriptType)),

  inputSchema: Schema.optional(JsonSchemaType),
  outputSchema: Schema.optional(JsonSchemaType),

  // Local binding to a function name.
  binding: Schema.optional(Schema.String),
}) {}
