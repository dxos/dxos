//
// Copyright 2024 DXOS.org
//

import { ParseResult } from '@effect/schema';

import { AST, S } from '@dxos/effect';

import { FormatAnnotationId, FormatEnum } from './types';

/**
 * Datetime values should be stored as ISO strings or unix numbers (ms) in UTC.
 *
 * NOTE: HyperFormula uses Excel's time format (null date 1900/01/01)
 * It can be configured to use a different parser via `parseDateTime`.
 * https://hyperformula.handsontable.com/guide/date-and-time-handling.html#date-and-time-handling
 * https://github.com/handsontable/hyperformula/blob/master/src/DateTimeHelper.ts
 */

// TODO(burdon): Annotations not present in JSON.
// TODO(burdon): Timezone.
// TODO(burdon): Format for timestamp (Unix UTC or ISO 8601)?
// TODO(burdon): Refs
//  - https://www.npmjs.com/package/numfmt
//  - https://date-fns.org/docs/Getting-Started
//  - https://github.com/date-fns/tz

/**
 * Simple date compatible with HF.
 */
export const SimpleDate = S.Struct({
  year: S.Number.pipe(S.between(1900, 9999)),
  month: S.Number.pipe(S.between(1, 12)),
  day: S.Number.pipe(S.between(1, 31)),
});

export type SimpleDate = S.Schema.Type<typeof SimpleDate>;

export const toSimpleDate = (date: Date): SimpleDate => ({
  year: date.getUTCFullYear(),
  month: date.getUTCMonth() + 1,
  day: date.getUTCDate(),
});

/**
 * Simple time compatible with HF.
 */
export const SimpleTime = S.Struct({
  hours: S.Number.pipe(S.between(0, 23)),
  minutes: S.Number.pipe(S.between(0, 59)),
  seconds: S.Number.pipe(S.between(0, 59)),
});

export type SimpleTime = S.Schema.Type<typeof SimpleTime>;

export const toSimpleTime = (date: Date): SimpleTime => ({
  hours: date.getUTCHours(),
  minutes: date.getUTCSeconds(),
  seconds: date.getUTCSeconds(),
});

/**
 * Simple date-time compatible with HF.
 */
export const SimpleDateTime = S.extend(SimpleDate, SimpleTime);

export type SimpleDateTime = S.Schema.Type<typeof SimpleDateTime>;

export const toSimpleDateTime = (date: Date): SimpleDateTime => ({
  ...toSimpleDate(date),
  ...toSimpleTime(date),
});

/**
 * https://effect.website/docs/guides/schema/transformations#date-transformations
 */

/**
 * Format: 2018-11-13
 */
export const DateOnly = /*S.transformOrFail(S.String, SimpleDate, {
  strict: true,
  decode: (str, _, ast) => {
    if (!isValidDateFormat(str)) {
      return ParseResult.fail(new ParseResult.Type(ast, str, 'Expected YYYY-MM-DD format'));
    }
    if (!isValidDate(str)) {
      return ParseResult.fail(new ParseResult.Type(ast, str, 'Invalid date'));
    }

    const [year, month, day] = str.split('-').map(Number);
    return ParseResult.succeed({ year, month, day });
  },
  encode: (date) => {
    return ParseResult.succeed(
      [
        date.year.toString().padStart(4, '0'),
        date.month.toString().padStart(2, '0'),
        date.day.toString().padStart(2, '0'),
      ].join('-'),
    );
  },
})*/ S.String.annotations({
  [FormatAnnotationId]: FormatEnum.Date,
  [AST.TitleAnnotationId]: 'Date',
  [AST.DescriptionAnnotationId]: 'Valid date in ISO format',
});

/**
 * Format: 20:20:39+00:00
 */
export const TimeOnly = /*S.transformOrFail(S.String, SimpleTime, {
  strict: true,
  decode: (str, _, ast) => {
    if (!isValidTimeFormat(str)) {
      return ParseResult.fail(new ParseResult.Type(ast, str, 'Expected HH:mm:ss format'));
    }

    const [hours, minutes, seconds] = str.split(':').map(Number);
    return ParseResult.succeed({ hours, minutes, seconds });
  },
  encode: (time) => {
    return ParseResult.succeed(
      [
        time.hours.toString().padStart(2, '0'),
        time.minutes.toString().padStart(2, '0'),
        time.seconds.toString().padStart(2, '0'),
      ].join(':'),
    );
  },
})*/ S.String.annotations({
  [FormatAnnotationId]: FormatEnum.Date,
  [AST.TitleAnnotationId]: 'Time',
  [AST.DescriptionAnnotationId]: 'Valid time in ISO format',
});

/**
 * Format: 2018-11-13T20:20:39+00:00
 */
export const DateTime = /*S.transformOrFail(S.String, SimpleDateTime, {
  strict: false,
  decode: (str, _, ast) => {
    const [date, time] = str.split('T');
    if (!isValidDateFormat(date)) {
      return ParseResult.fail(new ParseResult.Type(ast, date, 'Expected YYYY-MM-DD format'));
    }
    if (!isValidDate(date)) {
      return ParseResult.fail(new ParseResult.Type(ast, date, 'Invalid date'));
    }
    if (!isValidTimeFormat(time)) {
      return ParseResult.fail(new ParseResult.Type(ast, str, 'Expected HH:mm:ss format'));
    }

    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return ParseResult.succeed({ year, month, day, hours, minutes, seconds });
  },
  encode: (datetime) => {
    return ParseResult.succeed(
      [
        [
          datetime.year.toString().padStart(4, '0'),
          datetime.month.toString().padStart(2, '0'),
          datetime.day.toString().padStart(2, '0'),
        ].join('-'),
        [
          datetime.hours.toString().padStart(2, '0'),
          datetime.minutes.toString().padStart(2, '0'),
          datetime.seconds.toString().padStart(2, '0'),
        ].join(':'),
      ].join('T'),
    );
  },
})*/ S.String.annotations({
  [FormatAnnotationId]: FormatEnum.DateTime,
  [AST.TitleAnnotationId]: 'DateTime',
});

/**
 * https://datatracker.ietf.org/doc/html/rfc3339#appendix-A
 */
// TODO(burdon): Define duration type.
export const Duration = S.String.annotations({
  examples: ['1h', '3D'],
});

//
// Utils
//

// YYYY-MM-DD
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateFormat = (str: string) => DATE_REGEX.test(str);

const isValidDate = (str: string) => {
  const date = new Date(str);
  return !isNaN(date.getTime()) && date.toISOString().startsWith(str);
};

// HH:mm:ss
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;

const isValidTimeFormat = (str: string) => TIME_REGEX.test(str);
