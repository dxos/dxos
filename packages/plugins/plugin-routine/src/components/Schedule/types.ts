//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

export const MinutelySpec = Schema.Struct({
  frequency: Schema.Literal('minutely').annotate({ title: 'Frequency' }),
  interval: Schema.Number.pipe(
    Schema.check(Schema.isInt()),
    Schema.check(Schema.isBetween({ minimum: 1, maximum: 59 })),
  ).annotate({
    title: 'Every (minutes)',
    description: '1–59',
  }),
});

export const HourlySpec = Schema.Struct({
  frequency: Schema.Literal('hourly').annotate({ title: 'Frequency' }),
  interval: Schema.Number.pipe(
    Schema.check(Schema.isInt()),
    Schema.check(Schema.isBetween({ minimum: 1, maximum: 23 })),
  ).annotate({
    title: 'Every (hours)',
    description: '1–23',
  }),
  minute: Schema.Number.pipe(
    Schema.check(Schema.isInt()),
    Schema.check(Schema.isBetween({ minimum: 0, maximum: 59 })),
  ).annotate({
    title: 'At minute',
    description: '0–59',
  }),
});

export const DailySpec = Schema.Struct({
  frequency: Schema.Literal('daily').annotate({ title: 'Frequency' }),
  hour: Schema.Number.pipe(
    Schema.check(Schema.isInt()),
    Schema.check(Schema.isBetween({ minimum: 0, maximum: 23 })),
  ).annotate({
    title: 'Hour',
    description: '0–23',
  }),
  minute: Schema.Number.pipe(
    Schema.check(Schema.isInt()),
    Schema.check(Schema.isBetween({ minimum: 0, maximum: 59 })),
  ).annotate({
    title: 'Minute',
    description: '0–59',
  }),
});

// Named day-of-week literals for UX clarity; cron.ts maps them to numeric DOW values.
export const DayOfWeek = Schema.Literals(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
export type DayOfWeek = Schema.Schema.Type<typeof DayOfWeek>;

export const WeeklySpec = Schema.Struct({
  frequency: Schema.Literal('weekly').annotate({ title: 'Frequency' }),
  daysOfWeek: Schema.Array(DayOfWeek.annotate({ title: 'Day' })).annotate({ title: 'Days of week' }),
  hour: Schema.Number.pipe(
    Schema.check(Schema.isInt()),
    Schema.check(Schema.isBetween({ minimum: 0, maximum: 23 })),
  ).annotate({
    title: 'Hour',
    description: '0–23',
  }),
  minute: Schema.Number.pipe(
    Schema.check(Schema.isInt()),
    Schema.check(Schema.isBetween({ minimum: 0, maximum: 59 })),
  ).annotate({
    title: 'Minute',
    description: '0–59',
  }),
});

export const MonthlySpec = Schema.Struct({
  frequency: Schema.Literal('monthly').annotate({ title: 'Frequency' }),
  daysOfMonth: Schema.Array(
    Schema.Number.pipe(
      Schema.check(Schema.isInt()),
      Schema.check(Schema.isBetween({ minimum: 1, maximum: 31 })),
    ).annotate({ title: 'Day' }),
  ).annotate({
    title: 'Days of month',
  }),
  hour: Schema.Number.pipe(
    Schema.check(Schema.isInt()),
    Schema.check(Schema.isBetween({ minimum: 0, maximum: 23 })),
  ).annotate({
    title: 'Hour',
    description: '0–23',
  }),
  minute: Schema.Number.pipe(
    Schema.check(Schema.isInt()),
    Schema.check(Schema.isBetween({ minimum: 0, maximum: 59 })),
  ).annotate({
    title: 'Minute',
    description: '0–59',
  }),
});

export const CustomSpec = Schema.Struct({
  frequency: Schema.Literal('custom').annotate({ title: 'Frequency' }),
  cronExpression: Schema.String.annotate({
    title: 'Cron expression',
    description: 'e.g. 0 9 * * MON-FRI',
  }),
});

export const CronSpec = Schema.Union([
  MinutelySpec,
  HourlySpec,
  DailySpec,
  WeeklySpec,
  MonthlySpec,
  CustomSpec,
]).annotate({ title: '' });

export type CronSpecType = Schema.Schema.Type<typeof CronSpec>;
export type Frequency = CronSpecType['frequency'];

export const FrequencyDefaults: { [K in Frequency]: Extract<CronSpecType, { frequency: K }> } = {
  minutely: {
    frequency: 'minutely',
    interval: 15,
  },
  hourly: {
    frequency: 'hourly',
    interval: 1,
    minute: 0,
  },
  daily: {
    frequency: 'daily',
    hour: 9,
    minute: 0,
  },
  weekly: {
    frequency: 'weekly',
    daysOfWeek: ['mon'],
    hour: 9,
    minute: 0,
  },
  monthly: {
    frequency: 'monthly',
    daysOfMonth: [1],
    hour: 9,
    minute: 0,
  },
  custom: {
    frequency: 'custom',
    cronExpression: '* * * * *',
  },
};
