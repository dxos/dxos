//
// Copyright 2024 DXOS.org
//

import { AST, type JSONSchema } from '@effect/schema';

// TODO(burdon): Arrays, maps, enums.
// TODO(burdon): Reuse effect/JSON schema type literal?
export enum ScalarEnum {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Ref = 'ref',
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

// TODO(burdon): Better way?
export const getScalarTypeFromAst = (ast: AST.AST): ScalarEnum | undefined => {
  if (AST.isStringKeyword(ast)) {
    return ScalarEnum.String;
  } else if (AST.isNumberKeyword(ast)) {
    return ScalarEnum.Number;
  } else if (AST.isBooleanKeyword(ast)) {
    return ScalarEnum.Boolean;
  }

  // TODO(burdon): Enum?
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
  None = '',

  // TODO(burdon): Remove primitives from format and pass (type, format) tuple instead.
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',

  // TODO(burdon): Not implemented.
  Ref = 'ref',

  //
  // { type: 'string' }
  //

  DID = 'did', // Users, etc.
  Email = 'email',
  Formula = 'formula', // Spreadsheet formula.
  JSON = 'json',
  Regex = 'regex',
  // TODO(burdon): Different from string? E.g., S.String shouldn't be Automerge by default?
  Text = 'text',
  URI = 'uri',
  UUID = 'uuid',

  //
  // { type: 'number' }
  //

  Currency = 'currency',
  Percent = 'percent',
  Timestamp = 'timestamp',

  //
  // { type: 'date' }
  //

  DateTime = 'date-time',
  Date = 'date',
  Time = 'time',
  Duration = 'duration',
}

export const FormatEnums = Object.values(FormatEnum).sort();

export const PropertyKind = {
  type: ScalarEnum,
  format: FormatEnum,
};

/**
 * Map of format to type.
 */
export const formatToType: Record<FormatEnum, ScalarEnum> = {
  // TODO(burdon): Can we remove this?
  [FormatEnum.None]: undefined as any,

  // TODO(burdon): Remove.
  [FormatEnum.String]: ScalarEnum.String,
  [FormatEnum.Number]: ScalarEnum.Number,
  [FormatEnum.Boolean]: ScalarEnum.Boolean,

  [FormatEnum.Ref]: ScalarEnum.Ref,

  // Strings
  [FormatEnum.DID]: ScalarEnum.String,
  [FormatEnum.Email]: ScalarEnum.String,
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
