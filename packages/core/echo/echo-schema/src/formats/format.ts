//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import * as Keys from '@dxos/keys';

import * as DateUtil from './date';
import * as NumberUtil from './number';
import * as ObjectUtil from './object';
import * as StringUtil from './string';

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
  export const DXN = Keys.DXN;
  export const Email = StringUtil.Email;
  export const Formula = StringUtil.Formula;
  export const Hostname = StringUtil.Hostname;
  export const JSON = StringUtil.JSON;
  export const Markdown = StringUtil.Markdown;
  export const Regex = StringUtil.Regex;
  export const URL = StringUtil.URL;
  export const UUID = Schema.UUID;

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
  export type GeoPoint = ObjectUtil.GeoPoint;
}
