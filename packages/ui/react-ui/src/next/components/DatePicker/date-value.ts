//
// Copyright 2026 DXOS.org
//

import {
  type CalendarDate,
  type CalendarDateTime,
  DateFormatter,
  type DateValue,
  parseDate,
  parseDateTime,
  parseTime,
  toCalendarDate,
  toCalendarDateTime,
  today,
} from '@internationalized/date';

/** The native input types, whose value strings (`YYYY-MM-DD`, `HH:mm`, `YYYY-MM-DDTHH:mm`) DateInput keeps. */
export type DateInputType = 'date' | 'time' | 'datetime-local';

/** The smallest time unit a time-bearing DateInput edits; `second` adds `:ss` to the value string. */
export type DateInputGranularity = 'hour' | 'minute' | 'second';

/** zag values are floating (no zone), so every conversion uses UTC and never shifts a wall-clock time. */
export const TIME_ZONE = 'UTC';

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

const formatDate = (value: DateValue) => `${pad(value.year, 4)}-${pad(value.month)}-${pad(value.day)}`;

const formatTime = (value: CalendarDateTime, granularity: DateInputGranularity) =>
  `${pad(value.hour)}:${pad(value.minute)}${granularity === 'second' ? `:${pad(value.second)}` : ''}`;

/** The date a time-only value is placed on; zag edits whole dates, so a time needs one. */
export const baseDate = (): CalendarDate => today(TIME_ZONE);

/** Parses a value string of the given type; invalid or empty strings give `undefined`. */
export const parseValue = (
  type: DateInputType,
  value: string | undefined,
  base: CalendarDate,
): DateValue | undefined => {
  if (!value) {
    return undefined;
  }
  try {
    switch (type) {
      case 'date':
        return parseDate(value);
      case 'time':
        return toCalendarDateTime(base, parseTime(value));
      case 'datetime-local':
        return parseDateTime(value);
    }
  } catch {
    return undefined;
  }
};

/** Formats a zag value as the type's value string. */
export const formatValue = (type: DateInputType, value: DateValue, granularity: DateInputGranularity): string => {
  const time = toCalendarDateTime(value);
  switch (type) {
    case 'date':
      return formatDate(value);
    case 'time':
      return formatTime(time, granularity);
    case 'datetime-local':
      return `${formatDate(value)}T${formatTime(time, granularity)}`;
  }
};

/** Keeps the time of `current` when the calendar picks a new day for a date-time value. */
export const withDay = (type: DateInputType, current: DateValue | undefined, day: DateValue): DateValue => {
  if (type === 'date') {
    return toCalendarDate(day);
  }
  const time = current ? toCalendarDateTime(current) : toCalendarDateTime(toCalendarDate(day));
  return time.set({ year: day.year, month: day.month, day: day.day });
};

/**
 * A time-only field formats just hours and minutes (zag's own formatter always includes the date), so it passes its
 * own formatter and the editable segments that formatter yields.
 */
export const timeFormat = (locale: string, granularity: DateInputGranularity, hourCycle: 12 | 24) => {
  const formatter = new DateFormatter(locale, {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    ...(granularity !== 'hour' && { minute: '2-digit' }),
    ...(granularity === 'second' && { second: '2-digit' }),
    hourCycle: hourCycle === 12 ? 'h12' : 'h23',
  });
  const allSegments = Object.fromEntries(
    formatter
      .formatToParts(new Date())
      .filter((part) => ['hour', 'minute', 'second', 'dayPeriod'].includes(part.type))
      .map((part) => [part.type, true]),
  );
  return { formatter, allSegments };
};
