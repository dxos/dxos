//
// Copyright 2024 DXOS.org
//

import { type JSONSchema } from '@effect/schema';

export enum ScalarEnum {
  String,
  Number,
  Boolean,
  Ref,
}

export type ScalarType =
  | JSONSchema.JsonSchema7String
  | JSONSchema.JsonSchema7Number
  | JSONSchema.JsonSchema7Boolean
  | JSONSchema.JsonSchema7Ref;

export const getScalarType = (property: JSONSchema.JsonSchema7): ScalarEnum | undefined => {
  if ((property as any).$ref) {
    return ScalarEnum.Ref;
  }

  switch ((property as any).type) {
    case 'string':
      return ScalarEnum.String;
    case 'number':
      return ScalarEnum.Number;
    case 'boolean':
      return ScalarEnum.Boolean;
  }

  return undefined;
};

/**
 * https://json-schema.org/understanding-json-schema/reference/schema
 * https://json-schema.org/understanding-json-schema/reference/string#built-in-formats
 * TODO(burdon): Reconcile.
 *  - schema/formatting
 *  - react-ui-data/field
 *  - react-ui-table/column-utils
 *  - plugin-sheet/sheet-model
 *  - plugin-table/testing
 */
export const FormatAnnotationId = Symbol.for('@dxos/schema/annotation/Format');

export enum FormatEnum {
  // TODO(burdon): Remove primitives from format?
  /** @deprecated */
  String = 'string',
  /** @deprecated */
  Number = 'number',
  /** @deprecated */
  Boolean = 'boolean',

  // TODO(burdon): Not implemented.
  Ref = 'ref',

  //
  // { type: 'string' }
  //
  Email = 'email',
  URI = 'uri',
  // TODO(burdon): Not yet implemented.
  DID = 'did', // Users, etc.
  Formula = 'formula', // Spreadsheet formula.
  JSON = 'json',
  Regex = 'regex',
  Text = 'text', // TODO(burdon): ???
  UUID = 'uuid',

  //
  // { type: 'number' }
  //
  Currency = 'currency',
  Percent = 'percent',

  //
  // { type: 'date' }
  //
  Date = 'date',
  DateTime = 'date-time',
  Duration = 'duration',
  Time = 'time',
  Timestamp = 'timestamp',
}

export const FormatEnums = Object.values(FormatEnum).sort();
