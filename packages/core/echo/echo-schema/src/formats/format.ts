//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/effect';

import * as Date_ from './date';
import * as Number_ from './number';
import { CurrencyAnnotationId } from './number';
import * as String_ from './string';
import { FormatAnnotationId, FormatEnum } from './types';

// TODO(burdon): Consider factoring out to separate `@dxos/json-schema`

// TODO(burdon): Media encoding.
//  https://json-schema.org/understanding-json-schema/reference/non_json_data

// TODO(burdon): Arrays, maps, enums, etc.

/**
 * Formats.
 * https://json-schema.org/understanding-json-schema/reference/string#built-in-formats
 * NOTE: A JSON Schema validator will ignore any format type that it does not understand.
 */
// TODO(burdon): Define $id property for all declarations.
// TODO(burdon): Add fields for `examples`, `message`, etc.
export namespace Format {
  // Dates and times
  export const DateTime = Date_.DateTime;
  export const Date = Date_.DateOnly;
  export const Time = Date_.TimeOnly;
  export const Duration = Date_.Duration;

  // Numbers
  export const Currency = Number_.Currency;
  export const Percent = Number_.Percent;

  // Strings
  // TODO(burdon): Text?
  export const Email = String_.Email;
  export const Formula = String_.Formula;
  export const Hostname = String_.Hostname;
  export const JSON = String_.JSON;
  export const Regex = String_.Regex;
  export const URI = String_.URI;
  export const UUID = String_.UUID;
}

/**
 * List of annotations for JSON encoding/decoding.
 */
export const CustomAnnotations = {
  format: FormatAnnotationId,
  currency: CurrencyAnnotationId,

  // TODO(burdon): Are these automatic?
  // title: AST.TitleAnnotationId,
  // description: AST.DescriptionAnnotationId,
};

/**
 * Mixin of format annotation values.
 */
// TODO(burdon): Generate from annotations?
export const FormatSchema = S.Struct({
  type: S.String, // TODO(burdon): Typedef.
  format: S.optional(S.Enums(FormatEnum)),
  title: S.optional(S.String),
  description: S.optional(S.String),
  multipleOf: S.optional(S.Number),

  // Custom.
  currency: S.optional(S.String),
});

export type FormatType = S.Schema.Type<typeof FormatSchema>;
