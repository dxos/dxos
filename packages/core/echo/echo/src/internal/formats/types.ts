//
// Copyright 2024 DXOS.org
//

import * as Function from 'effect/Function';
import type * as JSONSchema from 'effect/JSONSchema';
import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';

import { createAnnotationHelper } from '../ast';
import { type JsonSchemaType } from '../json-schema';

// TODO(burdon): Rename PropertyType.
export type ScalarType =
  | JSONSchema.JsonSchema7Object
  | JSONSchema.JsonSchema7String
  | JSONSchema.JsonSchema7Number
  | JSONSchema.JsonSchema7Boolean
  | JSONSchema.JsonSchema7Ref;

// TODO(burdon): Rename ValueType and change to disciminated union.
// export type ValueType = 'array' | 'object' | 'string' | 'number' | 'boolean' | 'ref';
export enum TypeEnum {
  Array = 'array', // TODO(burdon): Remove?
  Object = 'object',
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  Ref = 'ref',
}

// TODO(burdon): Ref?
export const getTypeEnum = (property: JsonSchemaType): TypeEnum | undefined => {
  switch (property.type) {
    case 'array':
      return TypeEnum.Array;
    case 'object':
      return TypeEnum.Object;
    case 'string':
      return TypeEnum.String;
    case 'number':
      return TypeEnum.Number;
    case 'boolean':
      return TypeEnum.Boolean;
    default:
      return undefined;
  }
};

/**
 * https://json-schema.org/understanding-json-schema/reference/schema
 * https://json-schema.org/understanding-json-schema/reference/string#built-in-formats
 */
export const FormatAnnotationId = Symbol.for('@dxos/schema/annotation/Format');

export const FormatAnnotation = createAnnotationHelper<FormatEnum>(FormatAnnotationId);

export const getFormatAnnotation = (node: SchemaAST.AST): FormatEnum | undefined =>
  Function.pipe(SchemaAST.getAnnotation<FormatEnum>(FormatAnnotationId)(node), Option.getOrUndefined);

// TODO(burdon): Rename to TypeFormat and change to discriminated union.
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
  DXN = 'dxn',
  Email = 'email',
  Formula = 'formula', // Spreadsheet formula.
  Hostname = 'hostname',
  JSON = 'json',
  Markdown = 'markdown',
  Regex = 'regex',
  SingleSelect = 'single-select',
  MultiSelect = 'multi-select',
  URL = 'url',
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

  //
  // { type: 'object' }
  //

  GeoPoint = 'lnglat',
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
  [FormatEnum.DXN]: TypeEnum.String,
  [FormatEnum.Email]: TypeEnum.String,
  [FormatEnum.Formula]: TypeEnum.String,
  [FormatEnum.Hostname]: TypeEnum.String,
  [FormatEnum.JSON]: TypeEnum.String,
  [FormatEnum.Markdown]: TypeEnum.String,
  [FormatEnum.Regex]: TypeEnum.String,
  [FormatEnum.URL]: TypeEnum.String,
  [FormatEnum.UUID]: TypeEnum.String,
  [FormatEnum.SingleSelect]: TypeEnum.String,
  [FormatEnum.MultiSelect]: TypeEnum.Object,

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

  // Objects
  [FormatEnum.GeoPoint]: TypeEnum.Array,
};

/**
 * Allowed value options for select.
 */
export const OptionsAnnotationId = Symbol.for('@dxos/schema/annotation/Options');

export const getOptionsAnnotation = (node: SchemaAST.AST): OptionsAnnotationType[] | undefined =>
  Function.pipe(SchemaAST.getAnnotation<OptionsAnnotationType[]>(OptionsAnnotationId)(node), Option.getOrUndefined);

export type OptionsAnnotationType = string | number;
