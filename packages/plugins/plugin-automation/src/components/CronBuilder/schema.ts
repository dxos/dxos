//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

export const MinutelySpec = Schema.Struct({
  frequency: Schema.Literal('minutely').annotations({ title: 'Frequency' }),
  interval: Schema.Number.pipe(Schema.between(1, 59)).annotations({
    title: 'Every (minutes)',
    description: '1–59',
  }),
});

export const HourlySpec = Schema.Struct({
  frequency: Schema.Literal('hourly').annotations({ title: 'Frequency' }),
  interval: Schema.Number.pipe(Schema.between(1, 23)).annotations({
    title: 'Every (hours)',
    description: '1–23',
  }),
  minute: Schema.Number.pipe(Schema.between(0, 59)).annotations({
    title: 'At minute',
    description: '0–59',
  }),
});

export const DailySpec = Schema.Struct({
  frequency: Schema.Literal('daily').annotations({ title: 'Frequency' }),
  hour: Schema.Number.pipe(Schema.between(0, 23)).annotations({
    title: 'Hour',
    description: '0–23',
  }),
  minute: Schema.Number.pipe(Schema.between(0, 59)).annotations({
    title: 'Minute',
    description: '0–59',
  }),
});

// Named day-of-week literals for UX clarity; cron.ts maps them to numeric DOW values.
export const DayOfWeek = Schema.Literal('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat');
export type DayOfWeek = Schema.Schema.Type<typeof DayOfWeek>;

export const WeeklySpec = Schema.Struct({
  frequency: Schema.Literal('weekly').annotations({ title: 'Frequency' }),
  daysOfWeek: Schema.Array(DayOfWeek.annotations({ title: 'Day' })).annotations({ title: 'Days of week' }),
  hour: Schema.Number.pipe(Schema.between(0, 23)).annotations({
    title: 'Hour',
    description: '0–23',
  }),
  minute: Schema.Number.pipe(Schema.between(0, 59)).annotations({
    title: 'Minute',
    description: '0–59',
  }),
});

export const MonthlySpec = Schema.Struct({
  frequency: Schema.Literal('monthly').annotations({ title: 'Frequency' }),
  daysOfMonth: Schema.Array(Schema.Number.pipe(Schema.between(1, 31)).annotations({ title: 'Day' })).annotations({
    title: 'Days of month',
  }),
  hour: Schema.Number.pipe(Schema.between(0, 23)).annotations({
    title: 'Hour',
    description: '0–23',
  }),
  minute: Schema.Number.pipe(Schema.between(0, 59)).annotations({
    title: 'Minute',
    description: '0–59',
  }),
});

export const CustomSpec = Schema.Struct({
  frequency: Schema.Literal('custom').annotations({ title: 'Frequency' }),
  cronExpression: Schema.String.annotations({
    title: 'Cron expression',
    description: 'e.g. 0 9 * * MON-FRI',
  }),
});

export const CronSpec = Schema.Union(
  MinutelySpec,
  HourlySpec,
  DailySpec,
  WeeklySpec,
  MonthlySpec,
  CustomSpec,
).annotations({ title: '' });

export type CronSpecType = Schema.Schema.Type<typeof CronSpec>;
export type Frequency = CronSpecType['frequency'];

export const Frequencies = [
  'minutely',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'custom',
] as const satisfies readonly Frequency[];

export const FrequencyLabels: Record<Frequency, string> = {
  minutely: 'Every N minutes',
  hourly: 'Hourly',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  custom: 'Custom',
};

export const FrequencyDefaults: { [K in Frequency]: Extract<CronSpecType, { frequency: K }> } = {
  minutely: { frequency: 'minutely', interval: 15 },
  hourly: { frequency: 'hourly', interval: 1, minute: 0 },
  daily: { frequency: 'daily', hour: 9, minute: 0 },
  weekly: { frequency: 'weekly', daysOfWeek: ['mon'], hour: 9, minute: 0 },
  monthly: { frequency: 'monthly', daysOfMonth: [1], hour: 9, minute: 0 },
  custom: { frequency: 'custom', cronExpression: '* * * * *' },
};

export const CronBuilderSchema = Schema.Struct({ spec: CronSpec });
export type CronBuilderSchemaType = Schema.Schema.Type<typeof CronBuilderSchema>;
