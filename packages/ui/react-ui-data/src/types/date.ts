//
// Copyright 2024 DXOS.org
//

export type SimpleTime = {
  hours: number;
  minutes: number;
  seconds: number;
};

export type SimpleDate = {
  year: number;
  month: number;
  day: number;
};

export type SimpleDateTime = SimpleDate & SimpleTime;

// TODO(burdon): Format for timestamp (Unix UTC or ISO 8601)?
// TODO(burdon): Refs
//  - https://www.npmjs.com/package/numfmt
//  - https://date-fns.org/docs/Getting-Started
//  - https://github.com/date-fns/tz

/**
 * Datetime values should be stored as unix numbers (ms) in UTC.
 *
 * NOTE: HyperFormula uses Excel's time format (null date 1900/01/01)
 * It can be configured to use a different parser via `parseDateTime`.
 * https://hyperformula.handsontable.com/guide/date-and-time-handling.html#date-and-time-handling
 * https://github.com/handsontable/hyperformula/blob/master/src/DateTimeHelper.ts
 */
export class DateUtil {
  static toDateTime(value: number): SimpleDateTime {
    return {
      ...this.toDate(value),
      ...this.toTime(value),
    };
  }

  static toDate(value: number): SimpleDate {
    const date = new Date(value);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  }

  // TODO(burdon): Handle timezones.
  static toTime(value: number): SimpleTime {
    const date = new Date(value);
    return {
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
    };
  }
}
