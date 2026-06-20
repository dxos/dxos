//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, createContext, forwardRef, useCallback, useContext, useState } from 'react';

import { invariant } from '@dxos/invariant';
import {
  composable,
  composableProps,
  Input,
  ThemedClassName,
  ToggleGroup,
  ToggleGroupItem,
  useTranslation,
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { fromCron, scheduleToCron } from './cron';

//
// Value model.
//

export const ScheduleKinds = [
  // TODO(burdon): Once cannot be converted to a cron expression.
  // 'once',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'custom',
] as const;
export type ScheduleKind = (typeof ScheduleKinds)[number];

const isScheduleKind = (value: string): value is ScheduleKind => (ScheduleKinds as readonly string[]).includes(value);

export const Days = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
] as const;
export type Day = (typeof Days)[number]['value'];

/** Discriminated schedule value. Times are `HH:mm` (24h); `once.date` is `YYYY-MM-DDTHH:mm`. */
export type ScheduleValue =
  // | { kind: 'once'; date?: string }
  | { kind: 'hourly'; minute: number }
  | { kind: 'daily'; time: string }
  | { kind: 'weekly'; time: string; days: Day[] }
  | { kind: 'monthly'; day: number; time: string }
  | { kind: 'custom'; cron: string };

const DEFAULT_TIME = '08:00';

const KIND_LABEL_KEYS: Record<ScheduleKind, string> = {
  // once: 'schedule.kind.once.label',
  hourly: 'schedule.kind.hourly.label',
  daily: 'schedule.kind.daily.label',
  weekly: 'schedule.kind.weekly.label',
  monthly: 'schedule.kind.monthly.label',
  custom: 'schedule.kind.custom.label',
};

const DEFAULTS: { [K in ScheduleKind]: Extract<ScheduleValue, { kind: K }> } = {
  // once: {
  //   kind: 'once',
  // },
  hourly: {
    kind: 'hourly',
    minute: 0,
  },
  daily: {
    kind: 'daily',
    time: DEFAULT_TIME,
  },
  weekly: {
    kind: 'weekly',
    time: DEFAULT_TIME,
    days: ['mon'],
  },
  monthly: {
    kind: 'monthly',
    day: 1,
    time: DEFAULT_TIME,
  },
  custom: {
    kind: 'custom',
    cron: '0 9 * * 1',
  },
};

const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * Switch to a different kind, preserving the current schedule's timing by routing it through its cron
 * representation. The cron is the canonical carrier: each target kind reuses whatever fields it supports
 * (time-of-day, weekdays, day-of-month), falling back to the kind's default for fields the cron doesn't hold.
 */
const switchKind = (current: ScheduleValue, kind: ScheduleKind): ScheduleValue => {
  const cron = scheduleToCron(current);
  const spec = cron ? fromCron(cron) : undefined;
  const minute = spec && 'minute' in spec ? spec.minute : 0;
  const hour = spec && 'hour' in spec ? spec.hour : 0;
  const time = `${pad(hour)}:${pad(minute)}`;
  switch (kind) {
    case 'hourly':
      return { kind: 'hourly', minute };
    case 'daily':
      return { kind: 'daily', time };
    case 'weekly':
      return { kind: 'weekly', time, days: spec?.frequency === 'weekly' ? [...spec.daysOfWeek] : DEFAULTS.weekly.days };
    case 'monthly':
      return { kind: 'monthly', time, day: spec?.frequency === 'monthly' ? spec.daysOfMonth[0] : DEFAULTS.monthly.day };
    case 'custom':
      return { kind: 'custom', cron: cron ?? DEFAULTS.custom.cron };
  }
};

//
// Context
//

type ScheduleContextValue = {
  value: ScheduleValue;
  onValueChange: (value: ScheduleValue) => void;
  kinds: readonly ScheduleKind[];
  timezone?: string;
};

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

const useScheduleContext = (consumer: string): ScheduleContextValue => {
  const context = useContext(ScheduleContext);
  invariant(context, `${consumer} must be used within Schedule.Root`);
  return context;
};

//
// Root
//

export type ScheduleRootProps = ThemedClassName<
  PropsWithChildren<{
    value?: ScheduleValue;
    /** Timezone abbreviation shown in the summary, e.g. `EDT`. */
    timezone?: string;
    defaultValue?: ScheduleValue;
    onValueChange?: (value: ScheduleValue) => void;
    /** Restrict which frequency tabs are offered (defaults to all kinds). */
    kinds?: readonly ScheduleKind[];
  }>
>;

/**
 * Schedule picker root: provides the shared {@link Column} grid (all rows align to the same gutters)
 * and the schedule state context. Controllable via `value`/`onValueChange`, or self-managing via
 * `defaultValue`. Compose with `Schedule.Header`, `Schedule.Kind`, `Schedule.Body`, `Schedule.Description`.
 */
const ScheduleRoot = composable<HTMLDivElement, ScheduleRootProps>(
  (
    { children, value: valueProp, defaultValue, onValueChange, kinds = ScheduleKinds, timezone, ...props },
    forwardedRef,
  ) => {
    const [value, setValue] = useState<ScheduleValue>(valueProp ?? defaultValue ?? DEFAULTS.weekly);

    const handleValueChange = useCallback(
      (next: ScheduleValue) => {
        setValue(next);
        onValueChange?.(next);
      },
      [onValueChange],
    );

    return (
      <ScheduleContext.Provider
        value={{ value: valueProp ?? value, onValueChange: handleValueChange, kinds, timezone }}
      >
        <div {...composableProps(props, { classNames: 'flex flex-col gap-y-3' })} ref={forwardedRef}>
          {children}
        </div>
      </ScheduleContext.Provider>
    );
  },
);

ScheduleRoot.displayName = 'Schedule.Root';

//
// Header
//

export type ScheduleHeaderProps = { classNames?: string };

/**
 * Summary row laid out on the shared grid: the icon in the leading gutter (column 1), the schedule
 * description (or `children`) in the center column, and an optional close button in the trailing gutter
 * (column 3).
 */
const ScheduleHeader = forwardRef<HTMLDivElement, ScheduleHeaderProps>(({ classNames }, forwardedRef) => {
  const { t } = useTranslation(meta.profile.key);
  const { value, timezone } = useScheduleContext('Schedule.Header');
  return <p className={mx('grow truncate', classNames)}>{describeSchedule(value, timezone)}</p>;
});

ScheduleHeader.displayName = 'Schedule.Header';

//
// Kind
//

export type ScheduleKindProps = ThemedClassName;

/** Segmented frequency tabs (Once / Hourly / Daily / Weekly / Custom). */
const ScheduleKindRow = forwardRef<HTMLDivElement, ScheduleKindProps>(({ classNames }, forwardedRef) => {
  const { t } = useTranslation(meta.profile.key);
  const { value, onValueChange, kinds } = useScheduleContext('Schedule.Kind');
  const handleKindChange = useCallback(
    (kind: string) => {
      if (isScheduleKind(kind)) {
        onValueChange(switchKind(value, kind));
      }
    },
    [value, onValueChange],
  );

  return (
    <ToggleGroup type='single' value={value.kind} onValueChange={handleKindChange}>
      {kinds.map((kind) => (
        <ToggleGroupItem key={kind} value={kind}>
          {t(KIND_LABEL_KEYS[kind])}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
});

ScheduleKindRow.displayName = 'Schedule.Kind';

//
// Body
//

export type ScheduleBodyProps = ThemedClassName;

/** Per-kind editor for the active frequency. Rendered as a 3-column row so editors can use the gutters. */
const ScheduleBody = forwardRef<HTMLDivElement, ScheduleBodyProps>(({ classNames }, forwardedRef) => {
  const { value, onValueChange } = useScheduleContext('Schedule.Body');
  return <ScheduleEditor value={value} onChange={onValueChange} />;
});

ScheduleBody.displayName = 'Schedule.Body';

//
// Namespace.
//

export const Schedule = {
  Root: ScheduleRoot,
  Header: ScheduleHeader,
  Kind: ScheduleKindRow,
  Body: ScheduleBody,
};

//
// Per-kind editors.
//

const Field = ({ label, children }: PropsWithChildren<{ label: string }>) => (
  <label className='flex items-center gap-2'>
    <span className='text-sm text-description'>{label}</span>
    {children}
  </label>
);

const ScheduleEditor = ({ value, onChange }: { value: ScheduleValue; onChange: (value: ScheduleValue) => void }) => {
  const { t } = useTranslation(meta.profile.key);
  switch (value.kind) {
    // case 'once':
    // `Input.Root` renders no DOM, so the trigger (column 1) and the field (center) become direct children
    // of `Schedule.Body`'s row while still sharing the input context that wires the picker to the field.
    // return (
    //   <Input.Root>
    //     <div>
    //       <Field label={t('schedule.at.label')}>
    //         <Input.DateTime
    //           classNames='min-w-0 overflow-hidden'
    //           hourCycle={12}
    //           value={value.date ?? ''}
    //           onValueChange={(date) => onChange({ kind: 'once', date: date || undefined })}
    //         />
    //         <Input.TriggerIcon />
    //       </Field>
    //     </div>
    //   </Input.Root>
    // );

    case 'hourly':
      return (
        <Field label={t('schedule.minute.label')}>
          <Input.Root>
            <Input.TextInput
              type='number'
              min={0}
              max={59}
              step={1}
              classNames='w-15'
              value={String(value.minute)}
              onChange={(event) => {
                const minute = Math.min(59, Math.max(0, Math.round(Number(event.target.value) || 0)));
                onChange({ kind: 'hourly', minute });
              }}
            />
          </Input.Root>
        </Field>
      );

    case 'daily':
      return (
        <Field label={t('schedule.at.label')}>
          <Input.Root>
            <Input.Time hourCycle={12} value={value.time} onValueChange={(time) => onChange({ kind: 'daily', time })} />
          </Input.Root>
        </Field>
      );

    case 'weekly':
      return (
        <div className='flex gap-3'>
          <Field label={t('schedule.at.label')}>
            <Input.Root>
              <Input.Time hourCycle={12} value={value.time} onValueChange={(time) => onChange({ ...value, time })} />
            </Input.Root>
          </Field>
          <div className='grid grid-cols-7 gap-2 w-fit'>
            {Days.map(({ value: day, label }) => {
              const checked = value.days.includes(day);
              return (
                <label key={day} className='flex items-center gap-1'>
                  <Input.Root>
                    <Input.Checkbox
                      checked={checked}
                      onCheckedChange={(next) =>
                        onChange({
                          ...value,
                          // Preserve the canonical `Days` order so the summary reads naturally.
                          days: next
                            ? Days.map((d) => d.value).filter((d) => d === day || value.days.includes(d))
                            : value.days.filter((d) => d !== day),
                        })
                      }
                    />
                  </Input.Root>
                  <span className='text-sm'>{label}</span>
                </label>
              );
            })}
          </div>
        </div>
      );

    case 'monthly':
      return (
        <div className='flex items-center gap-3'>
          <Field label={t('schedule.day.label')}>
            <Input.Root>
              <Input.TextInput
                type='number'
                min={1}
                max={31}
                step={1}
                classNames='w-15'
                value={String(value.day)}
                onChange={(event) => {
                  const day = Math.min(31, Math.max(1, Math.round(Number(event.target.value) || 1)));
                  onChange({ ...value, day });
                }}
              />
            </Input.Root>
          </Field>
          <Field label={t('schedule.at.label')}>
            <Input.Root>
              <Input.Time hourCycle={12} value={value.time} onValueChange={(time) => onChange({ ...value, time })} />
            </Input.Root>
          </Field>
        </div>
      );

    case 'custom':
      return (
        <Field label={t('schedule.cron.label')}>
          <Input.Root>
            <Input.TextInput
              classNames='w-50 font-mono'
              placeholder='0 9 * * MON-FRI'
              value={value.cron}
              onChange={(event) => onChange({ kind: 'custom', cron: event.target.value })}
            />
          </Input.Root>
        </Field>
      );
  }
};

//
// Summary.
//

const DAY_NAMES: Record<Day, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

/** Format a `HH:mm` (24h) time as a 12-hour clock string, e.g. `9:00 AM`. */
const formatTime = (time: string): string => {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return time;
  }

  const period = h < 12 ? 'AM' : 'PM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
};

const withZone = (text: string, timezone?: string): string => (timezone ? `${text} ${timezone}` : text);

/** Human-readable summary of the schedule, suitable for the header. */
export const describeSchedule = (value: ScheduleValue, timezone?: string): string => {
  switch (value.kind) {
    // case 'once':
    //   return value.date
    //     ? `Runs once at ${formatTime(value.date.slice(11))} on ${value.date.slice(0, 10)}`
    //     : 'Runs once';
    case 'hourly':
      return `Runs every hour at minute ${value.minute}`;
    case 'daily':
      return withZone(`Runs every day at ${formatTime(value.time)}`, timezone);
    case 'weekly': {
      const days =
        value.days.length === 0
          ? 'no days'
          : value.days.length === 1
            ? DAY_NAMES[value.days[0]]
            : Days.filter((d) => value.days.includes(d.value))
                .map((d) => d.label)
                .join(', ');
      return withZone(`Runs every ${days} at ${formatTime(value.time)}`, timezone);
    }
    case 'monthly':
      return withZone(`Runs monthly on day ${value.day} at ${formatTime(value.time)}`, timezone);
    case 'custom':
      return `Runs on schedule ${value.cron}`;
  }
};
