//
// Copyright 2024 DXOS.org
//

import { PropertyMeta, type JsonPath } from '@dxos/echo-schema';
import { type AST, S, getAnnotation } from '@dxos/effect';

// TODO(burdon): Should we have a namespace or just contribute to the global "mixin" (like description)?
export const FILED_KIND_ANNOTATION = 'fieldKind';
export const FILED_PATH_ANNOTATION = 'fieldPath';

//
// FormatType
// TODO(burdon): Replace with Schema.pattern?
//  https://effect.website/docs/guides/schema/basic-usage#string-filters
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

// TODO(burdon): Can this be derived from the annotation? Or just be a union of all the annotation symbols?
//  - E.g., use a common annotation namespace.
export enum FieldKindEnum {
  // TODO(burdon): Array/Enum?
  // NOTE: Currently including these as a convenience.
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
  // TODO(burdon): ?
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

export const FieldKindEnums = Object.values(FieldKindEnum).sort();

// TODO(ZaymonFC): Find all the appropriate annotations.
// TODO(ZaymonFC): Pipe S.Pattern (regex) for email, url, etc.
// TODO(ZaymonFC): Enforce real / whole numbers where appropriate.
export const schemaForKind: Record<FieldKindEnum, S.Schema<any> | undefined> = {
  [FieldKindEnum.String]: S.String,
  [FieldKindEnum.Number]: S.Number,
  [FieldKindEnum.Boolean]: S.Boolean,
  [FieldKindEnum.Ref]: undefined,

  [FieldKindEnum.Text]: S.String,
  [FieldKindEnum.Date]: S.DateFromString,
  [FieldKindEnum.Email]: S.String.annotations({ [FormatAnnotationId]: EmailFormat }),
  [FieldKindEnum.URL]: S.String.annotations({ [FormatAnnotationId]: UrlFormat }),
  [FieldKindEnum.Percent]: S.Number,
  [FieldKindEnum.Currency]: S.Number,
  // [FieldKindEnum.User]: undefined,
  [FieldKindEnum.JSON]: undefined,
  [FieldKindEnum.Timestamp]: undefined,
  [FieldKindEnum.DateTime]: undefined,
  [FieldKindEnum.Time]: undefined,
  [FieldKindEnum.Formula]: undefined,
  [FieldKindEnum.DID]: undefined,
};

/**
 * Annotation to set field kind.
 */
// TODO(burdon): Instead of adding a "kind" annotation as a value, add an actual annotation representing the kind.
export const FieldKind = (kind: FieldKindEnum) => PropertyMeta(FILED_KIND_ANNOTATION, kind);

/**
 * Sets the path for the field.
 * @param path Data source path in the json path format. This is the field path in the source object.
 */
export const FieldPath = (path: JsonPath) => PropertyMeta(FILED_PATH_ANNOTATION, path);
