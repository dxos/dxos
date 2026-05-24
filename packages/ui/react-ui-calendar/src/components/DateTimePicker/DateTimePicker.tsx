//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { type Day } from 'date-fns';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef } from 'react';

import { Button, IconButton, Popover, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';

import { translationKey } from '#translations';

import { Calendar, type CalendarController, type Range as DateRange } from '../Calendar/Calendar';
import { SegmentedInput } from './SegmentedInput';
import {
  type DateSegmentOrder,
  type SegmentValues,
  type TimeSegmentOrder,
  formatSegments,
  parseSegments,
  resolveDateSegmentOrder,
  resolveHourCycle,
  resolveTimeSegmentOrder,
} from './segments';
import {
  type DateTimePickerMode,
  type DateTimePickerRootProps,
  type ValueFor,
  isDateMode,
  isRangeMode,
  isTimeMode,
} from './types';
import { type DateTimePickerState, type RangeEndpoint, useDateTimePicker } from './useDateTimePicker';
import { withDate, withTime } from './util';

//
// Context
//

type DateTimePickerContextValue = {
  state: DateTimePickerState<DateTimePickerMode>;
  dateOrder: DateSegmentOrder | undefined;
  timeOrder: TimeSegmentOrder | undefined;
  weekStartsOn: Day;
  step: number;
  disabled: boolean;
};

const [DateTimePickerContextProvider, useDateTimePickerContext] =
  createContext<DateTimePickerContextValue>('DateTimePicker');

//
// Root
//

const Root = <M extends DateTimePickerMode>({ children, ...props }: PropsWithChildren<DateTimePickerRootProps<M>>) => {
  const state = useDateTimePicker<M>(props);
  const locale = props.locale ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
  const hourCycle = props.hourCycle ?? resolveHourCycle(locale);
  const dateOrder = isDateMode(state.mode) ? resolveDateSegmentOrder(locale) : undefined;
  const timeOrder = isTimeMode(state.mode) ? resolveTimeSegmentOrder(hourCycle) : undefined;

  return (
    <Popover.Root open={state.open} onOpenChange={state.setOpen}>
      <DateTimePickerContextProvider
        state={state as DateTimePickerState<DateTimePickerMode>}
        dateOrder={dateOrder}
        timeOrder={timeOrder}
        weekStartsOn={props.weekStartsOn ?? 1}
        step={props.step ?? 15}
        disabled={props.disabled ?? false}
      >
        {children}
      </DateTimePickerContextProvider>
    </Popover.Root>
  );
};

//
// Input (trigger)
//

const INPUT_NAME = 'DateTimePicker.Input';

type InputProps = {};

const Input = composable<HTMLDivElement, InputProps>(({ classNames, ...props }, forwardedRef) => {
  const { state, dateOrder, timeOrder, disabled } = useDateTimePickerContext(INPUT_NAME);
  const { t } = useTranslation(translationKey);

  if (isRangeMode(state.mode)) {
    return (
      <div
        {...composableProps(props, {
          role: 'group',
          classNames: ['inline-flex items-center gap-2', classNames],
        })}
        ref={forwardedRef}
      >
        <EndpointSegments
          endpoint='from'
          label={t('range.from.label')}
          dateOrder={dateOrder}
          timeOrder={timeOrder}
          disabled={disabled}
        />
        <span className='text-description'>—</span>
        <EndpointSegments
          endpoint='to'
          label={t('range.to.label')}
          dateOrder={dateOrder}
          timeOrder={timeOrder}
          disabled={disabled}
        />
        <Popover.Trigger asChild>
          <IconButton
            variant='ghost'
            icon='ph--calendar--regular'
            iconOnly
            classNames='aspect-square'
            label={t('open.button')}
            disabled={disabled}
          />
        </Popover.Trigger>
      </div>
    );
  }

  return (
    <div
      {...composableProps(props, {
        role: 'group',
        classNames: ['inline-flex items-center gap-1', classNames],
      })}
      ref={forwardedRef}
    >
      <ScalarSegments dateOrder={dateOrder} timeOrder={timeOrder} disabled={disabled} />
      <Popover.Trigger asChild>
        <IconButton
          variant='ghost'
          icon='ph--calendar--regular'
          iconOnly
          classNames='aspect-square'
          label={t('open.button')}
          disabled={disabled}
        />
      </Popover.Trigger>
    </div>
  );
});

Input.displayName = INPUT_NAME;

//
// Internal: scalar segment row (binds to state.committed as a single Date)
//

type ScalarSegmentsProps = {
  dateOrder: DateSegmentOrder | undefined;
  timeOrder: TimeSegmentOrder | undefined;
  disabled: boolean;
};

const ScalarSegments = ({ dateOrder, timeOrder, disabled }: ScalarSegmentsProps) => {
  const { state } = useDateTimePickerContext(INPUT_NAME);
  const committed = state.committed as Date;
  const values = useMemo(() => formatSegments(committed, { dateOrder, timeOrder }), [committed, dateOrder, timeOrder]);

  const handleChange = useCallback(
    (next: SegmentValues) => {
      const parsed = parseSegments(next);
      if (parsed) {
        state.setCommitted(parsed as ValueFor<DateTimePickerMode>);
      }
    },
    [state],
  );

  return (
    <SegmentedInput
      dateOrder={dateOrder}
      timeOrder={timeOrder}
      values={values}
      onChange={handleChange}
      disabled={disabled}
    />
  );
};

//
// Internal: range endpoint segment row
//

type EndpointSegmentsProps = {
  endpoint: RangeEndpoint;
  label: string;
  dateOrder: DateSegmentOrder | undefined;
  timeOrder: TimeSegmentOrder | undefined;
  disabled: boolean;
};

const EndpointSegments = ({ endpoint, label, dateOrder, timeOrder, disabled }: EndpointSegmentsProps) => {
  const { state } = useDateTimePickerContext(INPUT_NAME);
  const range = state.committed as DateRange;
  const date = range[endpoint];
  const values = useMemo(() => formatSegments(date, { dateOrder, timeOrder }), [date, dateOrder, timeOrder]);

  const handleChange = useCallback(
    (next: SegmentValues) => {
      const parsed = parseSegments(next);
      if (parsed) {
        const updated = { ...range, [endpoint]: parsed };
        state.setCommitted(updated as ValueFor<DateTimePickerMode>);
      }
    },
    [endpoint, range, state],
  );

  return (
    <div className='inline-flex flex-col gap-0.5'>
      <span className='text-xs text-description'>{label}</span>
      <SegmentedInput
        dateOrder={dateOrder}
        timeOrder={timeOrder}
        values={values}
        onChange={handleChange}
        disabled={disabled}
      />
    </div>
  );
};

//
// Content (popover content)
//

const CONTENT_NAME = 'DateTimePicker.Content';

type ContentProps = {};

const Content = composable<HTMLDivElement, ContentProps>(({ classNames, ...props }, forwardedRef) => {
  const { state, weekStartsOn } = useDateTimePickerContext(CONTENT_NAME);
  const controllerRef = useRef<CalendarController>(null);

  useEffect(() => {
    if (!state.open) {
      return;
    }
    const draftDate = pickDate(state.draft, state.endpoint);
    if (draftDate) {
      controllerRef.current?.scrollTo(draftDate);
    }
  }, [state.open, state.draft, state.endpoint]);

  const handleSelect = useCallback(
    ({ date }: { date: Date }) => {
      if (isRangeMode(state.mode)) {
        const current = state.draft as DateRange;
        const updated = { ...current, [state.endpoint]: withDate(current[state.endpoint], date) };
        state.setDraft(updated as ValueFor<DateTimePickerMode>);
      } else {
        const current = state.draft as Date;
        state.setDraft(withDate(current, date) as ValueFor<DateTimePickerMode>);
      }
    },
    [state],
  );

  const handleSelectRange = useCallback(
    ({ range }: { range: DateRange }) => {
      if (!isRangeMode(state.mode)) {
        return;
      }
      const current = state.draft as DateRange;
      const updated = {
        from: withDate(current.from, range.from),
        to: withDate(current.to, range.to),
      };
      state.setDraft(updated as ValueFor<DateTimePickerMode>);
    },
    [state],
  );

  return (
    <Popover.Portal>
      <Popover.Content
        side='bottom'
        align='start'
        sideOffset={4}
        onEscapeKeyDown={() => state.cancelDraft()}
        onPointerDownOutside={() => state.cancelDraft()}
        {...composableProps(props, {
          classNames: ['p-2 rounded bg-modal-surface shadow-md flex flex-col gap-2', classNames],
        })}
        ref={forwardedRef}
      >
        {isDateMode(state.mode) && (
          <Calendar.Root ref={controllerRef} weekStartsOn={weekStartsOn}>
            <Calendar.Toolbar nav />
            <Calendar.Grid rows={6} onSelect={handleSelect} onSelectRange={handleSelectRange} />
          </Calendar.Root>
        )}
        {isTimeMode(state.mode) && <Time />}
        <Commit />
      </Popover.Content>
    </Popover.Portal>
  );
});

Content.displayName = CONTENT_NAME;

//
// Time
//

const TIME_NAME = 'DateTimePicker.Time';

const Time = () => {
  const { state, timeOrder, step } = useDateTimePickerContext(TIME_NAME);
  if (!timeOrder) {
    return null;
  }

  if (isRangeMode(state.mode)) {
    const range = state.draft as DateRange;
    return (
      <div className='flex items-center gap-3 justify-center text-sm text-description'>
        <TimeField endpoint='from' date={range.from} timeOrder={timeOrder} step={step} />
        <span>—</span>
        <TimeField endpoint='to' date={range.to} timeOrder={timeOrder} step={step} />
      </div>
    );
  }

  return (
    <div className='flex items-center justify-center text-sm text-description'>
      <TimeField endpoint={null} date={state.draft as Date} timeOrder={timeOrder} step={step} />
    </div>
  );
};

type TimeFieldProps = {
  endpoint: RangeEndpoint | null;
  date: Date;
  timeOrder: TimeSegmentOrder;
  step: number;
};

const TimeField = ({ endpoint, date, timeOrder, step }: TimeFieldProps) => {
  const { state } = useDateTimePickerContext(TIME_NAME);
  const values = useMemo(() => formatSegments(date, { timeOrder }), [date, timeOrder]);

  const handleChange = useCallback(
    (next: SegmentValues) => {
      const merged = { ...formatSegments(date, { dateOrder: ['yyyy', 'MM', 'dd'] }), ...next };
      const parsed = parseSegments(merged);
      if (!parsed) {
        return;
      }
      // Round minutes to nearest `step`; if rounding overflows to 60, carry into
      // the hour (Date.setHours normalizes hour overflow into day-of-month).
      const snappedMinutes = Math.round(parsed.getMinutes() / step) * step;
      const hourCarry = Math.floor(snappedMinutes / 60);
      const snapped = withTime(parsed, parsed.getHours() + hourCarry, snappedMinutes % 60);

      if (endpoint == null) {
        state.setDraft(snapped as ValueFor<DateTimePickerMode>);
      } else {
        const current = state.draft as DateRange;
        const updated = { ...current, [endpoint]: snapped };
        state.setDraft(updated as ValueFor<DateTimePickerMode>);
      }
    },
    [date, endpoint, state, step],
  );

  return <SegmentedInput timeOrder={timeOrder} values={values} onChange={handleChange} />;
};

//
// Commit
//

const COMMIT_NAME = 'DateTimePicker.Commit';

const Commit = () => {
  const { state } = useDateTimePickerContext(COMMIT_NAME);
  const { t } = useTranslation(translationKey);
  const handleClick = useCallback(() => {
    state.commit();
    state.setOpen(false);
  }, [state]);
  return (
    <div className='flex justify-end'>
      <Button variant='primary' onClick={handleClick}>
        {t('commit.button')}
      </Button>
    </div>
  );
};

//
// Helpers
//

const pickDate = (value: ValueFor<DateTimePickerMode>, endpoint: RangeEndpoint): Date | undefined => {
  if (value instanceof Date) {
    return value;
  }
  const range = value as DateRange;
  return range?.[endpoint];
};

//
// Namespace
//

export const DateTimePicker = {
  Root,
  Input,
  Content,
  Time,
  Commit,
};

export type { DateTimePickerRootProps };
