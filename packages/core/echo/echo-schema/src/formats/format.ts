//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import * as DateUtil from './date';
import * as NumberUtil from './number';
import { CurrencyAnnotationId } from './number';
import * as ObjectUtil from './object';
import * as StringUtil from './string';
import { FormatAnnotationId } from './types';

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
  export const Email = StringUtil.Email;
  export const Formula = StringUtil.Formula;
  export const Hostname = StringUtil.Hostname;
  export const JSON = StringUtil.JSON;
  export const Markdown = StringUtil.Markdown;
  export const Regex = StringUtil.Regex;
  export const URI = StringUtil.URI;
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
  export const LatLng = ObjectUtil.LatLng;
}

/**
 * List of annotations for JSON encoding/decoding.
 */
export const CustomAnnotations = {
  format: FormatAnnotationId,
  currency: CurrencyAnnotationId,
};
