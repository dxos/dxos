//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { JsonSchemaType, LabelAnnotation, Ref } from '@dxos/echo/internal';

import { Script } from './Script';
import { setUserFunctionIdInMetadata } from './url';

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

  /**
   * ISO date string of the last deployment.
   */
  updated: Schema.optional(Schema.String),

  // Reference to a source script if it exists within ECHO.
  // TODO(burdon): Don't ref ScriptType directly (core).
  source: Schema.optional(Ref(Script)),

  inputSchema: Schema.optional(JsonSchemaType),
  outputSchema: Schema.optional(JsonSchemaType),

  /**
   * List of required services.
   * Match the Context.Tag keys of the FunctionServices variants.
   */
  services: Schema.optional(Schema.Array(Schema.String)),

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

/**
 * Copies properties from source to target.
 * @param target - Target object to copy properties to.
 * @param source - Source object to copy properties from.
 */
export const setFrom = (target: Function, source: Function) => {
  target.key = source.key ?? target.key;
  target.name = source.name ?? target.name;
  target.version = source.version;
  target.description = source.description;
  // TODO(dmaretskyi): A workaround for an ECHO bug.
  target.inputSchema = JSON.parse(JSON.stringify(source.inputSchema));
  target.outputSchema = JSON.parse(JSON.stringify(source.outputSchema));
  Obj.getMeta(target).keys = JSON.parse(JSON.stringify(Obj.getMeta(source).keys));
};
