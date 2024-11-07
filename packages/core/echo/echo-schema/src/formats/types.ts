//
// Copyright 2024 DXOS.org
//

import { type JSONSchema } from '@effect/schema';

// TODO(burdon): Arrays, maps, enums.
export enum TypeEnum {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Object = 'object',
  Ref = 'ref',
}

export type ScalarType =
  | JSONSchema.JsonSchema7String
  | JSONSchema.JsonSchema7Number
  | JSONSchema.JsonSchema7Boolean
  | JSONSchema.JsonSchema7Object
  | JSONSchema.JsonSchema7Ref;

// TODO(burdon): Ref.
export const getTypeEnum = (property: JSONSchema.JsonSchema7): TypeEnum | undefined => {
  switch ((property as any).type) {
    case 'string':
      return TypeEnum.String;
    case 'number':
      return TypeEnum.Number;
    case 'boolean':
      return TypeEnum.Boolean;
    case 'object':
      return TypeEnum.Object;
  }
};

/**
 * https://json-schema.org/understanding-json-schema/reference/schema
 * https://json-schema.org/understanding-json-schema/reference/string#built-in-formats
 */
export const FormatAnnotationId = Symbol.for('@dxos/schema/annotation/Format');

export enum FormatEnum {
  None = 'none',
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Ref = 'ref',

  //
  // { type: 'string' }
  //

  DID = 'did', // Users, etc.
  Email = 'email',
  Formula = 'formula', // Spreadsheet formula.
  Hostname = 'hostname',
  JSON = 'json',
  Markdown = 'markdown',
  Regex = 'regex',
  URI = 'uri',
  UUID = 'uuid',

  //
  // { type: 'number' }
  //

  Currency = 'currency',
  Integer = 'integer',
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
  type: TypeEnum,
  format: FormatEnum,
};

/**
 * Default formats
 */
export const typeToFormat: Partial<Record<TypeEnum, FormatEnum>> = {
  [TypeEnum.String]: FormatEnum.String,
  [TypeEnum.Number]: FormatEnum.Number,
  [TypeEnum.Boolean]: FormatEnum.Boolean,
};

/**
 * Map of format to type.
 */
export const formatToType: Record<FormatEnum, TypeEnum> = {
  [FormatEnum.None]: undefined as any,
  [FormatEnum.String]: TypeEnum.String,
  [FormatEnum.Number]: TypeEnum.Number,
  [FormatEnum.Boolean]: TypeEnum.Boolean,
  [FormatEnum.Ref]: TypeEnum.Ref,

  // Strings
  [FormatEnum.DID]: TypeEnum.String,
  [FormatEnum.Email]: TypeEnum.String,
  [FormatEnum.Formula]: TypeEnum.String,
  [FormatEnum.Hostname]: TypeEnum.String,
  [FormatEnum.JSON]: TypeEnum.String,
  [FormatEnum.Markdown]: TypeEnum.String,
  [FormatEnum.Regex]: TypeEnum.String,
  [FormatEnum.URI]: TypeEnum.String,
  [FormatEnum.UUID]: TypeEnum.String,

  // Dates
  [FormatEnum.Date]: TypeEnum.String,
  [FormatEnum.DateTime]: TypeEnum.String,
  [FormatEnum.Duration]: TypeEnum.String,
  [FormatEnum.Time]: TypeEnum.String,

  // Numbers
  [FormatEnum.Currency]: TypeEnum.Number,
  [FormatEnum.Integer]: TypeEnum.Number,
  [FormatEnum.Percent]: TypeEnum.Number,
  [FormatEnum.Timestamp]: TypeEnum.Number,
};
