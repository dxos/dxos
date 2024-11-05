//
// Copyright 2024 DXOS.org
//

import { type JSONSchema } from '@effect/schema';

// TODO(burdon): Arrays, maps, enums.

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
 * TODO(burdon): Reconcile below (pass type and format).
 *  - schema/formatting
 *  - react-ui-data/field
 *  - react-ui-table/column-utils
 *  - plugin-sheet/sheet-model
 *  - plugin-table/testing
 */
export const FormatAnnotationId = Symbol.for('@dxos/schema/annotation/Format');

export enum FormatEnum {
  // TODO(burdon): Remove primitives from format and pass (type, format) tuple instead.
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
  DID = 'did', // Users, etc.
  Formula = 'formula', // Spreadsheet formula.
  JSON = 'json',
  Regex = 'regex',
  Text = 'text', // TODO(burdon): Different from string? E.g., S.String shouldn't be Automerge by default?
  URI = 'uri',
  UUID = 'uuid',

  //
  // { type: 'date' }
  //
  Date = 'date',
  DateTime = 'date-time',
  Duration = 'duration',
  Time = 'time',

  //
  // { type: 'number' }
  //
  Currency = 'currency',
  Percent = 'percent',
  Timestamp = 'timestamp', // TODO(burdon): Unix?
}

export const toFormatEnum = (value: string): FormatEnum | undefined => FormatEnum[value as keyof typeof FormatEnum];

export const FormatEnums = Object.values(FormatEnum).sort();

/**
 * Map of format to type.
 */
export const formatToType: Record<FormatEnum, ScalarEnum> = {
  // TODO(burdon): Remove.
  [FormatEnum.String]: ScalarEnum.String,
  [FormatEnum.Number]: ScalarEnum.Number,
  [FormatEnum.Boolean]: ScalarEnum.Boolean,
  [FormatEnum.Ref]: ScalarEnum.Ref,

  // Strings
  [FormatEnum.Email]: ScalarEnum.String,
  [FormatEnum.DID]: ScalarEnum.String,
  [FormatEnum.Formula]: ScalarEnum.String,
  [FormatEnum.JSON]: ScalarEnum.String,
  [FormatEnum.Regex]: ScalarEnum.String,
  [FormatEnum.Text]: ScalarEnum.String,
  [FormatEnum.URI]: ScalarEnum.String,
  [FormatEnum.UUID]: ScalarEnum.String,

  // Dates
  [FormatEnum.Date]: ScalarEnum.String,
  [FormatEnum.DateTime]: ScalarEnum.String,
  [FormatEnum.Duration]: ScalarEnum.String,
  [FormatEnum.Time]: ScalarEnum.String,

  // Numbers
  [FormatEnum.Currency]: ScalarEnum.Number,
  [FormatEnum.Percent]: ScalarEnum.Number,
  [FormatEnum.Timestamp]: ScalarEnum.Number,
};
