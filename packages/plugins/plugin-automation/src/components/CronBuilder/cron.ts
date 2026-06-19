//
// Copyright 2025 DXOS.org
//

import cronstrue from 'cronstrue';

import type { CronSpecType, DayOfWeek } from './schema';

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
