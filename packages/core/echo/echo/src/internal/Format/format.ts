//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Keys from '@dxos/keys';

import * as DateUtil from './date.ts';
import * as NumberUtil from './number.ts';
import * as ObjectUtil from './object.ts';
import * as StringUtil from './string.ts';
import { TypeFormat as TypeFormat$ } from './types.ts';

// TODO(burdon): Media encoding.
// - https://json-schema.org/understanding-json-schema/reference/non_json_data

/**
 * Formats.
 * https://json-schema.org/understanding-json-schema/reference/string#built-in-formats
 * NOTE: A JSON Schema validator will ignore any format type that it does not understand.
 */
// TODO(burdon): Add fields for `examples`, `message`, etc.
export namespace Format {
  export import TypeFormat = TypeFormat$;

  // String
  export const DXN = Keys.DXN.Schema;
  export const Email = StringUtil.Email;
  export const Formula = StringUtil.Formula;
  export const Hostname = StringUtil.Hostname;
  export const Regex = StringUtil.Regex;
  export const URL = StringUtil.URL;
  export const UUID = Schema.String.check(Schema.isUUID());

  // Numbers
  // TODO(burdon): BigInt.
  export const Currency = NumberUtil.Currency;
  export const Integer = NumberUtil.Integer;
  export const Percent = NumberUtil.Percent;
  export const Timestamp = NumberUtil.Timestamp;

  // Dates and times
  export const Date = DateUtil.DateOnly;
  export const DateTime = DateUtil.DateTime;
  export const Duration = DateUtil.Duration;
  export const Time = DateUtil.TimeOnly;

  // Objects
  export const GeoPoint = ObjectUtil.GeoPoint;
  export type GeoPoint = ObjectUtil.GeoPoint; // TODO(burdon): Export types.
}
