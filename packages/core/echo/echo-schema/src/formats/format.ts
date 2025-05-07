//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';
import { DescriptionAnnotationId, TitleAnnotationId } from 'effect/SchemaAST';

import * as DateUtil from './date';
import * as NumberUtil from './number';
import { CurrencyAnnotationId } from './number';
import * as ObjectUtil from './object';
import * as StringUtil from './string';
import { FormatAnnotationId } from './types';
import { GeneratorAnnotationId, LabelAnnotationId, PropertyMetaAnnotationId, type JsonSchemaType } from '../ast';

// TODO(burdon): Consider factoring out to separate `@dxos/json-schema`
// TODO(burdon): Media encoding.
//  - https://json-schema.org/understanding-json-schema/reference/non_json_data

/**
 * Formats.
 * https://json-schema.org/understanding-json-schema/reference/string#built-in-formats
 * NOTE: A JSON Schema validator will ignore any format type that it does not understand.
 */
// TODO(burdon): Add fields for `examples`, `message`, etc.
export namespace Format {
  // Strings
  export const DXN = StringUtil.DXN;
  export const Email = StringUtil.Email;
  export const Formula = StringUtil.Formula;
  export const Hostname = StringUtil.Hostname;
  export const JSON = StringUtil.JSON;
  export const Markdown = StringUtil.Markdown;
  export const Regex = StringUtil.Regex;
  export const URL = StringUtil.URL;
  export const UUID = S.UUID;

  // Numbers
  // TODO(burdon): BigInt.
  export const Currency = NumberUtil.Currency;
  export const Integer = NumberUtil.Integer;
  export const Percent = NumberUtil.Percent;
  export const Timestamp = NumberUtil.Timestamp;

  // Dates and times
  export const DateTime = DateUtil.DateTime;
  export const Date = DateUtil.DateOnly;
  export const Time = DateUtil.TimeOnly;
  export const Duration = DateUtil.Duration;

  // Objects
  export const GeoPoint = ObjectUtil.GeoPoint;
}

/**
 * List of annotations for JSON encoding/decoding.
 * Omits default effect-schema annotations since they are encoded with default serializer.
 */
export const CustomAnnotations = {
  format: FormatAnnotationId,
  currency: CurrencyAnnotationId,
};

/**
 * List of annotations for JSON decoding only.
 * Includes default effect annotations.
 */
export const DecodedAnnotations = {
  title: TitleAnnotationId,
  description: DescriptionAnnotationId,
};

/**
 * Annotations that go into ECHO namespace in json-schema.
 */
// TODO(dmaretskyi): Consider removing ECHO namespace and putting them at the top level.
export const EchoAnnotations: Partial<Record<keyof NonNullable<JsonSchemaType['echo']>, symbol>> = {
  annotations: PropertyMetaAnnotationId,
  generator: GeneratorAnnotationId,
  labelProp: LabelAnnotationId,

  // TODO(dmaretskyi): `FieldLookupAnnotationId` might go here, but lets remove it entirely and use LabelAnnotation instead.
};
