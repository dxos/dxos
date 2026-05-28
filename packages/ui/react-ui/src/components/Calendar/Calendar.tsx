//
// Copyright 2026 DXOS.org
//

import { CalendarDate, parseDate } from '@internationalized/date';
import React, { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import {
  Button as RACButton,
  Calendar as RACCalendar,
  CalendarCell as RACCalendarCell,
  type CalendarProps as RACCalendarProps,
  CalendarGrid as RACCalendarGrid,
  CalendarGridBody as RACCalendarGridBody,
  CalendarGridHeader as RACCalendarGridHeader,
  CalendarHeaderCell as RACCalendarHeaderCell,
  Heading as RACHeading,
  I18nProvider,
  RangeCalendar as RACRangeCalendar,
  type RangeCalendarProps as RACRangeCalendarProps,
  type DateValue,
} from 'react-aria-components';

import { type ClassNameValue } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { Icon } from '../Icon';

//
// Date <-> CalendarDate conversion.
// External API stays `Date` (and `{from,to}`-style range objects) so existing call sites keep working.
//

const toCalendarDate = (date: Date | undefined): CalendarDate | null => {
  if (!date) {
    return null;
  }
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
};

const fromCalendarDate = (value: DateValue | null | undefined): Date | undefined => {
  if (!value) {
    return undefined;
  }
  return new Date(value.year, value.month - 1, value.day);
};

export type DateRange = { from: Date; to?: Date };

//
// Public API.
//

type BaseCalendarProps = {
  classNames?: ClassNameValue;
  className?: string;
  isDisabled?: boolean;
  minValue?: Date;
  maxValue?: Date;
  /** Month to render when there's no selection — driven by the consuming picker. */
  defaultMonth?: Date;
};

type SingleProps = BaseCalendarProps & {
  mode?: 'single';
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
};

type RangeProps = BaseCalendarProps & {
  mode: 'range';
  selected?: DateRange;
  onSelect?: (range: DateRange | undefined) => void;
};

export type CalendarRootProps = SingleProps | RangeProps;

const CalendarShell = ({
  classNames,
  className,
  isDisabled,
  children,
}: {
  classNames?: ClassNameValue;
  className?: string;
  isDisabled?: boolean;
  children: ReactNode;
}) => {
  const { tx } = useThemeContext();
  return (
    <I18nProvider locale='en-US'>
      <div
        className={tx('calendar.root', {}, classNames, className) ?? undefined}
        aria-disabled={isDisabled || undefined}
      >
        {children}
      </div>
    </I18nProvider>
  );
};

const CalendarChrome = () => {
  const { tx } = useThemeContext();
  return (
    <header className={tx('calendar.nav', {}) ?? undefined}>
      <RACButton slot='previous' className={tx('calendar.button_previous', {}) ?? undefined}>
        <Icon size={4} icon='ph--caret-left--regular' />
      </RACButton>
      <RACHeading className={tx('calendar.caption_label', {}) ?? undefined} />
      <RACButton slot='next' className={tx('calendar.button_next', {}) ?? undefined}>
        <Icon size={4} icon='ph--caret-right--regular' />
      </RACButton>
    </header>
  );
};

const CalendarGridContent = () => {
  const { tx } = useThemeContext();
  return (
    <RACCalendarGrid className={tx('calendar.month_grid', {}) ?? undefined}>
      <RACCalendarGridHeader className={tx('calendar.weekdays', {}) ?? undefined}>
        {(day) => (
          <RACCalendarHeaderCell className={tx('calendar.weekday', {}) ?? undefined}>{day}</RACCalendarHeaderCell>
        )}
      </RACCalendarGridHeader>
      <RACCalendarGridBody>
        {(date) => <RACCalendarCell date={date} className={tx('calendar.day', {}) ?? undefined} />}
      </RACCalendarGridBody>
    </RACCalendarGrid>
  );
};

const CalendarRoot = forwardRef<HTMLDivElement, CalendarRootProps>((props, _forwardedRef) => {
  const { classNames, className, isDisabled, minValue, maxValue, defaultMonth } = props;
  const defaultFocused = toCalendarDate(defaultMonth) ?? undefined;

  if (props.mode === 'range') {
    const racProps: RACRangeCalendarProps<CalendarDate> = {
      isDisabled,
      minValue: toCalendarDate(minValue) ?? undefined,
      maxValue: toCalendarDate(maxValue) ?? undefined,
      defaultFocusedValue: defaultFocused,
      value: props.selected?.from
        ? {
            start: toCalendarDate(props.selected.from)!,
            end: toCalendarDate(props.selected.to ?? props.selected.from)!,
          }
        : undefined,
      onChange: (next) => {
        if (!next) {
          props.onSelect?.(undefined);
          return;
        }
        const from = fromCalendarDate(next.start);
        const to = fromCalendarDate(next.end);
        if (from) {
          props.onSelect?.({ from, to });
        }
      },
    };
    return (
      <CalendarShell classNames={classNames} className={className} isDisabled={isDisabled}>
        <RACRangeCalendar {...racProps}>
          <CalendarChrome />
          <CalendarGridContent />
        </RACRangeCalendar>
      </CalendarShell>
    );
  }

  const racProps: RACCalendarProps<CalendarDate> = {
    isDisabled,
    minValue: toCalendarDate(minValue) ?? undefined,
    maxValue: toCalendarDate(maxValue) ?? undefined,
    defaultFocusedValue: defaultFocused,
    value: toCalendarDate(props.selected),
    onChange: (next) => props.onSelect?.(fromCalendarDate(next)),
  };
  return (
    <CalendarShell classNames={classNames} className={className} isDisabled={isDisabled}>
      <RACCalendar {...racProps}>
        <CalendarChrome />
        <CalendarGridContent />
      </RACCalendar>
    </CalendarShell>
  );
});

CalendarRoot.displayName = 'Calendar.Root';

export const Calendar = {
  Root: CalendarRoot,
};

// Re-export the iso parser for convenience.
export { parseDate as parseCalendarDate };
export type { ComponentPropsWithoutRef };
