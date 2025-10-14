//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { JsonSchemaType, LabelAnnotation, Ref } from '@dxos/echo-schema';
import { DataType } from '@dxos/schema';

// TODO(burdon): Create namespace and remove Type suffix.

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
  Type.Obj({
    typename: 'dxos.org/type/Script',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
);

export interface ScriptType extends Schema.Schema.Type<typeof ScriptType> {}

/**
 * Function deployment.
 */
export const FunctionType = Schema.Struct({
  /**
   * Global registry ID.
   * NOTE: The `key` property refers to the original registry entry.
   */
  // TODO(burdon): Create Format type for DXN-like ids, such as this and schema type.
  // TODO(dmaretskyi): Consider making it part of ECHO meta.
  // TODO(dmaretskyi): Make required.
  key: Schema.optional(Schema.String).annotations({
    description: 'Unique registration key for the blueprint',
  }),

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
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Function',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
);

export interface FunctionType extends Schema.Schema.Type<typeof FunctionType> {}
