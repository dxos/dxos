//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import {
  clampSchedule,
  cronIntervalSeconds,
  cronToSchedule,
  fromCron,
  scheduleIntervalSeconds,
  scheduleToCron,
  toCron,
} from './cron';
import { type ScheduleValue } from './Schedule';

describe('toCron', () => {
  test('minutely: every 15 minutes', ({ expect }) => {
    expect(toCron({ frequency: 'minutely', interval: 15 })).toBe('*/15 * * * *');
  });

  test('minutely: every 1 minute', ({ expect }) => {
    expect(toCron({ frequency: 'minutely', interval: 1 })).toBe('*/1 * * * *');
  });

  test('hourly: every hour at minute 0', ({ expect }) => {
    expect(toCron({ frequency: 'hourly', interval: 1, minute: 0 })).toBe('0 */1 * * *');
  });

  test('hourly: every 6 hours at minute 30', ({ expect }) => {
    expect(toCron({ frequency: 'hourly', interval: 6, minute: 30 })).toBe('30 */6 * * *');
  });

  test('daily: at 09:00', ({ expect }) => {
    expect(toCron({ frequency: 'daily', hour: 9, minute: 0 })).toBe('0 9 * * *');
  });

  test('daily: at 22:30', ({ expect }) => {
    expect(toCron({ frequency: 'daily', hour: 22, minute: 30 })).toBe('30 22 * * *');
  });

  test('weekly: Monday at 09:00', ({ expect }) => {
    expect(toCron({ frequency: 'weekly', daysOfWeek: ['mon'], hour: 9, minute: 0 })).toBe('0 9 * * 1');
  });

  test('weekly: Mon, Wed, Fri at 08:00', ({ expect }) => {
    expect(toCron({ frequency: 'weekly', daysOfWeek: ['mon', 'wed', 'fri'], hour: 8, minute: 0 })).toBe(
      '0 8 * * 1,3,5',
    );
  });

  test('weekly: Sunday (DOW=0) at midnight', ({ expect }) => {
    expect(toCron({ frequency: 'weekly', daysOfWeek: ['sun'], hour: 0, minute: 0 })).toBe('0 0 * * 0');
  });

  test('weekly: empty daysOfWeek falls back to wildcard', ({ expect }) => {
    expect(toCron({ frequency: 'weekly', daysOfWeek: [], hour: 9, minute: 0 })).toBe('0 9 * * *');
  });

  test('monthly: 1st at 09:00', ({ expect }) => {
    expect(toCron({ frequency: 'monthly', daysOfMonth: [1], hour: 9, minute: 0 })).toBe('0 9 1 * *');
  });

  test('monthly: 1st and 15th at 12:00', ({ expect }) => {
    expect(toCron({ frequency: 'monthly', daysOfMonth: [1, 15], hour: 12, minute: 0 })).toBe('0 12 1,15 * *');
  });

  test('monthly: empty daysOfMonth falls back to wildcard', ({ expect }) => {
    expect(toCron({ frequency: 'monthly', daysOfMonth: [], hour: 9, minute: 0 })).toBe('0 9 * * *');
  });

  test('custom: pass-through full cron expression', ({ expect }) => {
    expect(toCron({ frequency: 'custom', cronExpression: '0 9 * * MON-FRI' })).toBe('0 9 * * MON-FRI');
  });

  test('custom: empty cronExpression defaults to wildcard', ({ expect }) => {
    expect(toCron({ frequency: 'custom', cronExpression: '' })).toBe('* * * * *');
  });

  test('custom: step expression preserved', ({ expect }) => {
    expect(toCron({ frequency: 'custom', cronExpression: '0/15 * * * *' })).toBe('0/15 * * * *');
  });
});

describe('fromCron', () => {
  test('minutely', ({ expect }) => {
    expect(fromCron('*/15 * * * *')).toEqual({ frequency: 'minutely', interval: 15 });
  });

  test('hourly', ({ expect }) => {
    expect(fromCron('30 */6 * * *')).toEqual({ frequency: 'hourly', interval: 6, minute: 30 });
  });

  test('daily', ({ expect }) => {
    expect(fromCron('0 9 * * *')).toEqual({ frequency: 'daily', hour: 9, minute: 0 });
  });

  test('weekly single day', ({ expect }) => {
    expect(fromCron('0 9 * * 1')).toEqual({ frequency: 'weekly', daysOfWeek: ['mon'], hour: 9, minute: 0 });
  });

  test('weekly multiple days', ({ expect }) => {
    expect(fromCron('0 8 * * 1,3,5')).toEqual({
      frequency: 'weekly',
      daysOfWeek: ['mon', 'wed', 'fri'],
      hour: 8,
      minute: 0,
    });
  });

  test('monthly single day', ({ expect }) => {
    expect(fromCron('0 9 1 * *')).toEqual({ frequency: 'monthly', daysOfMonth: [1], hour: 9, minute: 0 });
  });

  test('monthly multiple days', ({ expect }) => {
    expect(fromCron('0 12 1,15 * *')).toEqual({ frequency: 'monthly', daysOfMonth: [1, 15], hour: 12, minute: 0 });
  });

  test('custom: unknown pattern', ({ expect }) => {
    expect(fromCron('0 9 * * MON-FRI')).toEqual({ frequency: 'custom', cronExpression: '0 9 * * MON-FRI' });
  });

  test('custom: wrong field count', ({ expect }) => {
    expect(fromCron('0 9 *')).toEqual({ frequency: 'custom', cronExpression: '0 9 *' });
  });

  test('round-trip: toCron → fromCron', ({ expect }) => {
    const specs = [
      { frequency: 'minutely' as const, interval: 15 },
      { frequency: 'hourly' as const, interval: 4, minute: 30 },
      { frequency: 'daily' as const, hour: 22, minute: 30 },
      { frequency: 'weekly' as const, daysOfWeek: ['mon', 'wed'] as const, hour: 9, minute: 0 },
      { frequency: 'monthly' as const, daysOfMonth: [1, 15], hour: 12, minute: 0 },
    ];
    for (const spec of specs) {
      expect(fromCron(toCron(spec))).toEqual(spec);
    }
  });
});

describe('Schedule <-> cron bridge', () => {
  test('recurring kinds round-trip through cron', ({ expect }) => {
    const cases: ScheduleValue[] = [
      { kind: 'hourly', minute: 5 },
      { kind: 'daily', time: '09:00' },
      { kind: 'weekly', time: '09:30', days: ['mon', 'wed'] },
      { kind: 'monthly', day: 15, time: '08:00' },
    ];

    for (const value of cases) {
      const cron = scheduleToCron(value);
      expect(cron).toBeDefined();
      expect(cronToSchedule(cron!)).toEqual(value);
    }
  });

  test('custom passes the expression through', ({ expect }) => {
    expect(scheduleToCron({ kind: 'custom', cron: '15 9 * * 1-5' })).toBe('15 9 * * 1-5');
  });

  test('cron patterns Schedule cannot model fall back to custom', ({ expect }) => {
    // Sub-hourly interval.
    expect(cronToSchedule('*/15 * * * *')).toEqual({ kind: 'custom', cron: '*/15 * * * *' });
    // Multiple days of the month.
    expect(cronToSchedule('0 8 1,15 * *')).toEqual({ kind: 'custom', cron: '0 8 1,15 * *' });
  });
});

describe('minimum interval', () => {
  test('cronIntervalSeconds reads common cadences', ({ expect }) => {
    expect(cronIntervalSeconds('* * * * *')).toBe(60);
    expect(cronIntervalSeconds('*/1 * * * *')).toBe(60);
    expect(cronIntervalSeconds('*/5 * * * *')).toBe(300);
    expect(cronIntervalSeconds('0,30 * * * *')).toBe(1800);
    // Single minute, every hour.
    expect(cronIntervalSeconds('0 * * * *')).toBe(3600);
    // Single minute, every day (a weekday restriction only widens gaps, so the daily floor stands).
    expect(cronIntervalSeconds('0 9 * * *')).toBe(86400);
    expect(cronIntervalSeconds('0 9 * * 1-5')).toBe(86400);
    // Expressions whose minute field cannot be analysed are treated as satisfying any minimum.
    expect(cronIntervalSeconds('not a cron')).toBe(Number.POSITIVE_INFINITY);
    expect(cronIntervalSeconds('0-5/2 * * * *')).toBe(Number.POSITIVE_INFINITY);
  });

  test('scheduleIntervalSeconds covers structured kinds', ({ expect }) => {
    expect(scheduleIntervalSeconds({ kind: 'hourly', minute: 0 })).toBe(3600);
    expect(scheduleIntervalSeconds({ kind: 'daily', time: '09:00' })).toBe(86400);
    expect(scheduleIntervalSeconds({ kind: 'custom', cron: '* * * * *' })).toBe(60);
  });

  test('clampSchedule rewrites a too-frequent custom cron', ({ expect }) => {
    expect(clampSchedule({ kind: 'custom', cron: '* * * * *' }, 300)).toEqual({ kind: 'custom', cron: '*/5 * * * *' });
    expect(clampSchedule({ kind: 'custom', cron: '*/1 * * * *' }, 300)).toEqual({
      kind: 'custom',
      cron: '*/5 * * * *',
    });
    // An hourly minimum collapses a sub-hourly step to the top of the hour.
    expect(clampSchedule({ kind: 'custom', cron: '*/15 * * * *' }, 3600)).toEqual({
      kind: 'custom',
      cron: '0 * * * *',
    });
  });

  test('clampSchedule leaves satisfying schedules untouched', ({ expect }) => {
    expect(clampSchedule({ kind: 'custom', cron: '*/15 * * * *' }, 300)).toEqual({
      kind: 'custom',
      cron: '*/15 * * * *',
    });
    expect(clampSchedule({ kind: 'custom', cron: '0 9 * * 1' }, 300)).toEqual({ kind: 'custom', cron: '0 9 * * 1' });
    expect(clampSchedule({ kind: 'hourly', minute: 0 }, 3600)).toEqual({ kind: 'hourly', minute: 0 });
  });
});
