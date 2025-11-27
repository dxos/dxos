//
// Copyright 2024 DXOS.org
//

import * as Function from 'effect/Function';
import type * as JSONSchema from 'effect/JSONSchema';
import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';

import { createAnnotationHelper } from '../annotations';
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

export const FormatAnnotation = createAnnotationHelper<TypeFormat>(FormatAnnotationId);

export const getFormatAnnotation = (node: SchemaAST.AST): TypeFormat | undefined =>
  Function.pipe(SchemaAST.getAnnotation<TypeFormat>(FormatAnnotationId)(node), Option.getOrUndefined);

// TODO(burdon): Rename Format; Change to discriminated union?
export enum TypeFormat {
  None = 'none',

  //
  // Scalar
  //

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

export const FormatEnums = Object.values(TypeFormat).sort();

export const PropertyKind = {
  type: TypeEnum,
  format: TypeFormat,
};

/**
 * Default formats
 */
export const typeToFormat: Partial<Record<TypeEnum, TypeFormat>> = {
  [TypeEnum.String]: TypeFormat.String,
  [TypeEnum.Number]: TypeFormat.Number,
  [TypeEnum.Boolean]: TypeFormat.Boolean,
};

/**
 * Map of format to type.
 */
export const formatToType: Record<TypeFormat, TypeEnum> = {
  [TypeFormat.None]: undefined as any,
  [TypeFormat.String]: TypeEnum.String,
  [TypeFormat.Number]: TypeEnum.Number,
  [TypeFormat.Boolean]: TypeEnum.Boolean,
  [TypeFormat.Ref]: TypeEnum.Ref,

  // Strings
  [TypeFormat.DID]: TypeEnum.String,
  [TypeFormat.DXN]: TypeEnum.String,
  [TypeFormat.Email]: TypeEnum.String,
  [TypeFormat.Formula]: TypeEnum.String,
  [TypeFormat.Hostname]: TypeEnum.String,
  [TypeFormat.JSON]: TypeEnum.String,
  [TypeFormat.Markdown]: TypeEnum.String,
  [TypeFormat.Regex]: TypeEnum.String,
  [TypeFormat.URL]: TypeEnum.String,
  [TypeFormat.UUID]: TypeEnum.String,
  [TypeFormat.SingleSelect]: TypeEnum.String,
  [TypeFormat.MultiSelect]: TypeEnum.Object,

  // Dates
  [TypeFormat.Date]: TypeEnum.String,
  [TypeFormat.DateTime]: TypeEnum.String,
  [TypeFormat.Duration]: TypeEnum.String,
  [TypeFormat.Time]: TypeEnum.String,

  // Numbers
  [TypeFormat.Currency]: TypeEnum.Number,
  [TypeFormat.Integer]: TypeEnum.Number,
  [TypeFormat.Percent]: TypeEnum.Number,
  [TypeFormat.Timestamp]: TypeEnum.Number,

  // Objects
  [TypeFormat.GeoPoint]: TypeEnum.Array,
};

/**
 * Allowed value options for select.
 */
export const OptionsAnnotationId = Symbol.for('@dxos/schema/annotation/Options');

export const getOptionsAnnotation = (node: SchemaAST.AST): OptionsAnnotationType[] | undefined =>
  Function.pipe(SchemaAST.getAnnotation<OptionsAnnotationType[]>(OptionsAnnotationId)(node), Option.getOrUndefined);

export type OptionsAnnotationType = string | number;
