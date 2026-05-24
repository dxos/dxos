//
// Copyright 2026 DXOS.org
//

import React from 'react';
import {
  DayPicker,
  type ClassNames,
  type CustomComponents,
  type DayPickerProps,
  type DayProps,
  type FooterProps,
  type MonthCaptionProps,
  type NavProps,
} from 'react-day-picker';

import { type ClassNameValue } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';

// Slot names match react-day-picker v9 `ClassNames` enum values.
const themeSlots = [
  'root',
  'months',
  'month',
  'month_caption',
  'caption_label',
  'nav',
  'button_previous',
  'button_next',
  'month_grid',
  'weekdays',
  'weekday',
  'week',
  'day',
  'day_button',
  'selected',
  'today',
  'outside',
  'disabled',
  'range_start',
  'range_middle',
  'range_end',
  'hidden',
  'footer',
] as const;

// Distributive `Omit` so the DayPicker discriminated union is preserved per variant.
type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;

export type CalendarRootProps = DistributiveOmit<DayPickerProps, 'classNames' | 'className'> & {
  /** Class string applied to the calendar root (DXOS convention). */
  classNames?: ClassNameValue;
  /** Slot-level class overrides matching react-day-picker's `ClassNames` shape. Merged on top of theme defaults. */
  slots?: Partial<ClassNames>;
};

const CalendarRoot = ({ classNames, slots, components, ...props }: CalendarRootProps) => {
  const { tx } = useThemeContext();
  const themed: Partial<ClassNames> = {};
  for (const slot of themeSlots) {
    themed[slot] = tx(`calendar.${slot}`, {}, slots?.[slot]);
  }
  return (
    <DayPicker
      // Spread loses union narrowing inside the function body; restore the type at the DayPicker boundary.
      {...(props as DayPickerProps)}
      className={tx('calendar.root', {}, classNames)}
      classNames={{ ...themed, root: undefined }}
      components={{
        MonthCaption: CalendarMonthCaption,
        Nav: CalendarNav,
        ...(components ?? {}),
      }}
    />
  );
};
CalendarRoot.displayName = 'Calendar.Root';

//
// Slot defaults exposed on the namespace.
// Consumers may pass these (or their own wrappers) via DayPicker's `components` prop.
//

const CalendarMonthCaption: CustomComponents['MonthCaption'] = ({
  calendarMonth,
  displayIndex: _displayIndex,
  ...rest
}: MonthCaptionProps) => {
  return (
    <div {...rest}>
      <span>{calendarMonth.date.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</span>
    </div>
  );
};

const CalendarNav: CustomComponents['Nav'] = ({
  onPreviousClick,
  onNextClick,
  previousMonth,
  nextMonth,
  ...rest
}: NavProps) => {
  return (
    <nav {...rest}>
      <button type='button' onClick={onPreviousClick} aria-disabled={!previousMonth}>
        {'‹'}
      </button>
      <button type='button' onClick={onNextClick} aria-disabled={!nextMonth}>
        {'›'}
      </button>
    </nav>
  );
};

const CalendarFooter: CustomComponents['Footer'] = ({ ...rest }: FooterProps) => <div {...rest} />;

const CalendarDay: CustomComponents['Day'] = ({ day, modifiers: _modifiers, ...rest }: DayProps) => {
  return <div {...rest}>{day.date.getDate()}</div>;
};

export const Calendar = {
  Root: CalendarRoot,
  Day: CalendarDay,
  MonthCaption: CalendarMonthCaption,
  Nav: CalendarNav,
  Footer: CalendarFooter,
};

export type { ClassNames as CalendarClassNames, DayPickerProps };
