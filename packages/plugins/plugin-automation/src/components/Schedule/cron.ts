//
// Copyright 2025 DXOS.org
//

import cronstrue from 'cronstrue';

import type { ScheduleValue } from './Schedule';
import type { CronSpecType, DayOfWeek } from './types';

const DOW_MAP: Record<DayOfWeek, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

/**
 * Derives a 5-field standard cron expression from a decomposed CronSpec value.
 * Fields: minute hour day-of-month month day-of-week
 */
export const toCron = (value: CronSpecType): string => {
  switch (value.frequency) {
    case 'minutely':
      return `*/${value.interval} * * * *`;

    case 'hourly':
      return `${value.minute} */${value.interval} * * *`;

    case 'daily':
      return `${value.minute} ${value.hour} * * *`;

    case 'weekly': {
      const dow = value.daysOfWeek.length > 0 ? value.daysOfWeek.map((d) => DOW_MAP[d]).join(',') : '*';
      return `${value.minute} ${value.hour} * * ${dow}`;
    }

    case 'monthly': {
      const dom = value.daysOfMonth.length > 0 ? value.daysOfMonth.join(',') : '*';
      return `${value.minute} ${value.hour} ${dom} * *`;
    }

    case 'custom':
      return value.cronExpression || '* * * * *';
  }
};

const DOW_REVERSE: Partial<Record<string, DayOfWeek>> = {
  '0': 'sun',
  '1': 'mon',
  '2': 'tue',
  '3': 'wed',
  '4': 'thu',
  '5': 'fri',
  '6': 'sat',
  // Both 0 and 7 represent Sunday in standard cron.
  '7': 'sun',
};

/** Returns a non-negative integer if the token is a valid decimal integer, otherwise undefined. */
const parseUInt = (token: string): number | undefined => (/^\d+$/.test(token) ? Number(token) : undefined);

/** Returns the parsed integer if it falls within [min, max], otherwise undefined. */
const parseBoundedUInt = (token: string, min: number, max: number): number | undefined => {
  const value = parseUInt(token);
  return value !== undefined && value >= min && value <= max ? value : undefined;
};

/**
 * Parses a 5-field cron expression into a CronSpec value.
 * Recognises common patterns (minutely, hourly, daily, weekly, monthly) and falls back to `custom`.
 */
export const fromCron = (cron: string): CronSpecType => {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { frequency: 'custom', cronExpression: cron };
  }

  const [minute, hour, dom, month, dow] = parts;

  // minutely: */N * * * *
  const minutelyMatch = minute.match(/^\*\/(\d+)$/);
  if (minutelyMatch && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return { frequency: 'minutely', interval: parseInt(minutelyMatch[1]) };
  }

  // hourly: M */N * * *
  const hourlyMatch = hour.match(/^\*\/(\d+)$/);
  const minuteNum = parseBoundedUInt(minute, 0, 59);
  if (hourlyMatch && dom === '*' && month === '*' && dow === '*' && minuteNum !== undefined) {
    return { frequency: 'hourly', interval: parseInt(hourlyMatch[1]), minute: minuteNum };
  }

  const hourNum = parseBoundedUInt(hour, 0, 23);
  if (minuteNum === undefined || hourNum === undefined) {
    return { frequency: 'custom', cronExpression: cron };
  }

  // weekly: M H * * DOW[,DOW...]  (numeric DOW values only; all tokens must be valid)
  if (dom === '*' && month === '*' && dow !== '*') {
    const tokens = dow.split(',');
    const days = tokens.map((d) => DOW_REVERSE[d]).filter((d): d is DayOfWeek => d != null);
    if (days.length === tokens.length && days.length > 0) {
      return { frequency: 'weekly', daysOfWeek: days, hour: hourNum, minute: minuteNum };
    }
    return { frequency: 'custom', cronExpression: cron };
  }

  // monthly: M H DOM[,DOM...] * *  (all tokens must be valid integers in 1-31)
  if (dom !== '*' && month === '*' && dow === '*') {
    const tokens = dom.split(',');
    const days = tokens.map((d) => parseBoundedUInt(d, 1, 31)).filter((d): d is number => d !== undefined);
    if (days.length === tokens.length && days.length > 0) {
      return { frequency: 'monthly', daysOfMonth: days, hour: hourNum, minute: minuteNum };
    }
    return { frequency: 'custom', cronExpression: cron };
  }

  // daily: M H * * *
  if (dom === '*' && month === '*' && dow === '*') {
    return { frequency: 'daily', hour: hourNum, minute: minuteNum };
  }

  return { frequency: 'custom', cronExpression: cron };
};

/**
 * Returns a human-readable description of a cron expression, e.g. "At 09:00 on Monday".
 * Falls back to the raw expression string on parse errors.
 */
export const describeCron = (cron: string): string => {
  try {
    return cronstrue.toString(cron, { throwExceptionOnParseError: true });
  } catch {
    return cron;
  }
};

//
// Schedule <-> cron bridge.
//

const pad = (value: number): string => String(value).padStart(2, '0');

const splitTime = (time: string): { hour: number; minute: number } => {
  const [hour, minute] = time.split(':').map(Number);
  return { hour: Number.isFinite(hour) ? hour : 0, minute: Number.isFinite(minute) ? minute : 0 };
};

const joinTime = (hour: number, minute: number): string => `${pad(hour)}:${pad(minute)}`;

/**
 * Convert a recurring {@link ScheduleValue} to a 5-field cron expression. The one-time `once` kind has no
 * cron representation and returns `undefined`.
 */
export const scheduleToCron = (value: ScheduleValue): string | undefined => {
  switch (value.kind) {
    case 'once':
      return undefined;
    case 'hourly':
      return toCron({ frequency: 'hourly', interval: 1, minute: value.minute });
    case 'daily': {
      const { hour, minute } = splitTime(value.time);
      return toCron({ frequency: 'daily', hour, minute });
    }
    case 'weekly': {
      const { hour, minute } = splitTime(value.time);
      return toCron({ frequency: 'weekly', daysOfWeek: value.days, hour, minute });
    }
    case 'monthly': {
      const { hour, minute } = splitTime(value.time);
      return toCron({ frequency: 'monthly', daysOfMonth: [value.day], hour, minute });
    }
    case 'custom':
      return toCron({ frequency: 'custom', cronExpression: value.cron });
  }
};

/**
 * Convert a cron expression to a recurring {@link ScheduleValue}. Patterns that Schedule cannot model exactly
 * (sub-hourly intervals, multi-day months, etc.) fall back to the `custom` kind preserving the raw expression.
 */
export const cronToSchedule = (cron: string): ScheduleValue => {
  const spec = fromCron(cron);
  switch (spec.frequency) {
    case 'hourly':
      // Schedule's hourly runs at the top of every hour; a non-unit interval can't be modelled.
      return spec.interval === 1 ? { kind: 'hourly', minute: spec.minute } : { kind: 'custom', cron };
    case 'daily':
      return { kind: 'daily', time: joinTime(spec.hour, spec.minute) };
    case 'weekly':
      return { kind: 'weekly', time: joinTime(spec.hour, spec.minute), days: [...spec.daysOfWeek] };
    case 'monthly':
      // Schedule models a single day-of-month; multiple days remain custom.
      return spec.daysOfMonth.length === 1
        ? { kind: 'monthly', day: spec.daysOfMonth[0], time: joinTime(spec.hour, spec.minute) }
        : { kind: 'custom', cron };
    case 'minutely':
    case 'custom':
    default:
      return { kind: 'custom', cron };
  }
};
