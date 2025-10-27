//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { JsonSchemaType, LabelAnnotation, Ref } from '@dxos/echo/internal';

import { Script } from './Script';

/**
 * Function deployment.
 */
export const Function = Schema.Struct({
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
  source: Schema.optional(Ref(Script)),

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
export interface Function extends Schema.Schema.Type<typeof Function> {}

export const make = (props: Obj.MakeProps<typeof Function>) => Obj.make(Function, props);
