//
// Copyright 2024 DXOS.org
//

import { setAnnotation, PropertyMeta, type JsonPath, type JsonSchemaType } from '@dxos/echo-schema';
import { type AST, S, getAnnotation } from '@dxos/effect';

// TODO(burdon): Replace with Schema.pattern?
//  https://effect.website/docs/guides/schema/basic-usage#string-filters

//
// FormatType
// TODO(burdon): Convert to/from string.
// TODO(burdon): Allow pasting and adapting non-conforming values (e.g., with spaces/hyphens).
//

export const FormatAnnotationId = Symbol.for('@dxos/schema/annotation/format');

export type FormatAnnotation = {
  filter: RegExp;
  valid?: RegExp;
};

export const getFormatAnnotation = (annotated: AST.Annotated) =>
  getAnnotation<FormatAnnotation>(FormatAnnotationId, annotated);

//
// Number
//

export const NumberAnnotationId = Symbol.for('@dxos/schema/annotation/number');

export type NumberFormatAnnotation = {
  decimal: number;
};

export const RealNumberFormat: FormatAnnotation = {
  filter: /^[+-]?(\d*(\.\d*)?)?$/,
};

export const WholeNumberFormat: FormatAnnotation = {
  filter: /^\d*$/,
};

export const CurrencyAnnotationId = Symbol.for('@dxos/schema/annotation/currency');
export const PercentAnnotationId = Symbol.for('@dxos/schema/annotation/percent');

//
// String
//

export const EmailAnnotationId = Symbol.for('@dxos/schema/annotation/email');

export const EmailFormat: FormatAnnotation = {
  filter: /^[a-zA-Z0-9._%+-]*@?[a-zA-Z0-9.-]*\.?[a-zA-Z]*$/,
  valid: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
};

export const UrlAnnotationId = Symbol.for('@dxos/schema/annotation/url');

export const UrlFormat: FormatAnnotation = {
  filter: /^(\w+?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
};

//
// Fields
//

// TODO(burdon): Reconcile with echo-schema/PropType... (which uses enum integers).
//  PropType = low-level primitives.
//  FieldValueType = higher-level "kind".
//  { type: 'number', kind: 'percent' }
export enum FieldValueType {
  // Effect schema.
  // String = 'string',
  // Boolean = 'boolean',
  // Number = 'number',
  // Primitives from echo-schema.
  // Ref = 'ref',

  // Arrays/Maps/Enum?
  User = 'user',
  Text = 'text',
  JSON = 'json',
  Timestamp = 'timestamp',
  DateTime = 'datetime',
  Date = 'date',
  Time = 'time',

  // Kind.
  Percent = 'percent',
  Currency = 'currency',
  Formula = 'formula',
  Email = 'email',
  URL = 'url',
  DID = 'did',

  // TODO(burdon): Other types:
  //  - Duration, Rating
  //  - Address, Phone number
}

export const FieldValueTypes = Object.values(FieldValueType).sort();

/**
 * Annotation to set field kind.
 */
// TODO(dmaretskyi): Rename `KindAnnotation`.
export const PropertyKind = (kind: FieldValueType) => PropertyMeta('dxos.schema', { kind });

/**
 * Sets the path for the field.
 * @param path Data source path in the json path format. This is the field path in the source object.
 */
export const ViewPath = (path: JsonPath) => PropertyMeta('dxos.view', { path });

// TODO(ZaymonFC): Find all the appropriate annotations.
// TODO(ZaymonFC): Pipe S.Pattern (regex) for email, url, etc.
// TODO(ZaymonFC): Enforce real / whole numbers where appropriate.
export const schemaForType: Record<FieldValueType, S.Schema<any> | undefined> = {
  [FieldValueType.Text]: S.String,
  [FieldValueType.Date]: S.DateFromString,
  [FieldValueType.Email]: S.String.annotations({ [FormatAnnotationId]: EmailFormat }),
  [FieldValueType.URL]: S.String.annotations({ [FormatAnnotationId]: UrlFormat }),
  [FieldValueType.Percent]: S.Number,
  [FieldValueType.Currency]: S.Number,
  [FieldValueType.User]: undefined,
  [FieldValueType.JSON]: undefined,
  [FieldValueType.Timestamp]: undefined,
  [FieldValueType.DateTime]: undefined,
  [FieldValueType.Time]: undefined,
  [FieldValueType.Formula]: undefined,
  [FieldValueType.DID]: undefined,
};

//
// View UX annotations
//

/**
 * Annotation to set column size.
 */
export const ColumnSize = (size: number) => PropertyMeta('dxos.view', { size });

export const setColumnSize = (schema: JsonSchemaType, property: string, size: number) => {
  setAnnotation(schema, property, 'dxos.view', { size });
};
