//
// Copyright 2024 DXOS.org
//

import { PropertyMeta, type JsonPath } from '@dxos/echo-schema';
import { type AST, S, getAnnotation } from '@dxos/effect';

export const FILED_PATH_ANNOTATION = 'path';

/**
 * Sets the path for the field.
 * @param path Data source path in the json path format. This is the field path in the source object.
 */
export const FieldPath = (path: JsonPath) => PropertyMeta(FILED_PATH_ANNOTATION, path);

// https://json-schema.org/understanding-json-schema/reference/string#built-in-formats
export const FIELD_FORMAT_ANNOTATION = 'format';

/**
 * Annotation to set field kind.
 */
// TODO(burdon): Instead of adding a "kind" annotation as a value, add an actual annotation representing the kind.
export const FieldFormat = (format: FieldFormatEnum) => PropertyMeta(FIELD_FORMAT_ANNOTATION, format);

// TODO(burdon):
//  - flat annotations using effect annotations at top level
//  - S.pattern annotations
//  - digits
//  - refs

//
// PatternAnnotation
// https://json-schema.org/understanding-json-schema/reference
// TODO(burdon): Replace with Schema.pattern
//  https://effect.website/docs/guides/schema/basic-usage#string-filters
// TODO(burdon): Allow pasting and adapting non-conforming values (e.g., with spaces/hyphens).
//

export const PatternAnnotationId = Symbol.for('@dxos/schema/annotation/pattern');

export type PatternAnnotation = {
  filter: RegExp;
  valid?: RegExp;
};

export const getPatternAnnotation = (annotated: AST.Annotated) =>
  getAnnotation<PatternAnnotation>(PatternAnnotationId, annotated);

//
// Number
//

export const NumberAnnotationId = Symbol.for('@dxos/schema/annotation/number');

export type NumberPatternAnnotation = {
  decimal: number;
};

export const RealNumberFormat: PatternAnnotation = {
  filter: /^[+-]?(\d*(\.\d*)?)?$/,
};

export const WholeNumberFormat: PatternAnnotation = {
  filter: /^\d*$/,
};

export const CurrencyAnnotationId = Symbol.for('@dxos/schema/annotation/currency');
export const PercentAnnotationId = Symbol.for('@dxos/schema/annotation/percent');

//
// String
//

export const EmailAnnotationId = Symbol.for('@dxos/schema/annotation/email');

export const EmailFormat: PatternAnnotation = {
  filter: /^[a-zA-Z0-9._%+-]*@?[a-zA-Z0-9.-]*\.?[a-zA-Z]*$/,
  valid: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
};

export const UrlAnnotationId = Symbol.for('@dxos/schema/annotation/url');

export const UrlFormat: PatternAnnotation = {
  filter: /^(\w+?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
};

//
// Fields
// TODO(burdon): Built-in formats https://json-schema.org/understanding-json-schema/reference/string#built-in-formats
//

// TODO(burdon): Can this be derived from the annotation? Or just be a union of all the annotation symbols?
//  - E.g., use a common annotation namespace.
export enum FieldFormatEnum {
  // TODO(burdon): Array/Enum?
  // NOTE: Currently including these as a convenience.
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  // ?
  Ref = 'ref',

  Text = 'text',
  JSON = 'json',
  Timestamp = 'timestamp',
  DateTime = 'datetime',
  Date = 'date',
  Time = 'time',
  Percent = 'percent',
  Currency = 'currency',
  Formula = 'formula',
  Email = 'email',
  // User = 'user',
  URL = 'url',
  DID = 'did',

  // TODO(burdon): Other types:
  //  - Duration, Rating
  //  - Address, Phone number
}

export const FieldFormatEnums = Object.values(FieldFormatEnum).sort();

// TODO(ZaymonFC): Find all the appropriate annotations.
// TODO(ZaymonFC): Pipe S.Pattern (regex) for email, url, etc.
// TODO(ZaymonFC): Enforce real / whole numbers where appropriate.
export const formatToSchema: Record<FieldFormatEnum, S.Schema<any> | undefined> = {
  [FieldFormatEnum.String]: S.String,
  [FieldFormatEnum.Number]: S.Number,
  [FieldFormatEnum.Boolean]: S.Boolean,
  [FieldFormatEnum.Ref]: undefined,

  [FieldFormatEnum.Text]: S.String,
  [FieldFormatEnum.Date]: S.DateFromString,
  [FieldFormatEnum.Email]: S.String.annotations({ [PatternAnnotationId]: EmailFormat }),
  [FieldFormatEnum.URL]: S.String.annotations({ [PatternAnnotationId]: UrlFormat }),
  [FieldFormatEnum.Percent]: S.Number,
  [FieldFormatEnum.Currency]: S.Number,
  // [FieldFormatEnum.User]: undefined,
  [FieldFormatEnum.JSON]: undefined,
  [FieldFormatEnum.Timestamp]: undefined,
  [FieldFormatEnum.DateTime]: undefined,
  [FieldFormatEnum.Time]: undefined,
  [FieldFormatEnum.Formula]: undefined,
  [FieldFormatEnum.DID]: undefined,
};
