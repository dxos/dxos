//
// Copyright 2026 DXOS.org
//

import React from 'react';
import {
  DayPicker,
  type DayPickerProps,
  type ClassNames,
  type CustomComponents,
} from 'react-day-picker';

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

export type CalendarProps = DayPickerProps;

const CalendarRoot = ({ classNames: classNamesProp, components, ...props }: CalendarProps) => {
  const { tx } = useThemeContext();
  const themed: Partial<ClassNames> = {};
  for (const slot of themeSlots) {
    themed[slot] = tx(`calendar.${slot}`, {}, classNamesProp?.[slot]);
  }
  return (
    <DayPicker
      // Spread loses union narrowing inside the function body; restore the type at the DayPicker boundary.
      {...(props as DayPickerProps)}
      classNames={themed}
      components={{
        MonthCaption: MonthCaptionDefault,
        Nav: NavDefault,
        ...(components ?? {}),
      }}
    />
  );
};
CalendarRoot.displayName = 'Calendar';

//
// Slot defaults exported on the namespace.
// Consumers may pass these (or their own wrappers) via DayPicker's `components` prop.
//

type MonthCaptionProps = Parameters<typeof import('react-day-picker').MonthCaption>[0];
type NavProps = Parameters<typeof import('react-day-picker').Nav>[0];
type DayProps = Parameters<typeof import('react-day-picker').Day>[0];
type FooterProps = Parameters<typeof import('react-day-picker').Footer>[0];

const MonthCaptionDefault: CustomComponents['MonthCaption'] = ({
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

const NavDefault: CustomComponents['Nav'] = ({
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

const FooterDefault: CustomComponents['Footer'] = ({ ...rest }: FooterProps) => <div {...rest} />;

const DayDefault: CustomComponents['Day'] = ({ day, modifiers: _modifiers, ...rest }: DayProps) => {
  return <div {...rest}>{day.date.getDate()}</div>;
};

export const Calendar = Object.assign(CalendarRoot, {
  Day: DayDefault,
  MonthCaption: MonthCaptionDefault,
  Nav: NavDefault,
  Footer: FooterDefault,
});

export type { ClassNames as CalendarClassNames, DayPickerProps };
