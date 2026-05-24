//
// Copyright 2026 DXOS.org
//

import React, { forwardRef } from 'react';
import {
  DayPicker,
  type ClassNames,
  type CustomComponents,
  type DayPickerProps,
  type DayProps,
  type FooterProps,
  type NavProps,
  useDayPicker,
} from 'react-day-picker';

import { type ClassNameValue } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';
import { useTranslation } from '../../primitives';
import { translationKey } from '../../translations';
import { composableProps } from '../../util';
import { IconButton } from '../Button';

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

// Distribute `Omit` over the DayPicker discriminated union so each variant preserves its correlated
// `mode` / `selected` / `onSelect` triple at call sites.
type DistributiveOmit<U, K extends keyof any> = U extends unknown ? Omit<U, K> : never;

export type CalendarRootProps = DistributiveOmit<DayPickerProps, 'classNames' | 'className'> & {
  /** Consumer-facing theming override (DXOS convention). Merged with any `className` from a Slot parent. */
  classNames?: ClassNameValue;
  /** Forwarded from a Radix Slot parent; merged with `classNames`. */
  className?: string;
  /** Slot-level class overrides matching react-day-picker's `ClassNames` shape. Merged on top of theme defaults. */
  slots?: Partial<ClassNames>;
};

const CalendarRoot = forwardRef<HTMLDivElement, CalendarRootProps>(({ slots, components, ...props }, _forwardedRef) => {
  const { tx } = useThemeContext();
  const themed: Partial<ClassNames> = {};
  for (const slot of themeSlots) {
    themed[slot] = tx(`calendar.${slot}`, {}, slots?.[slot]);
  }
  // composableProps merges any `className` from a Slot parent with the consumer-facing `classNames` and
  // the theme default into a single `className` for DayPicker; DayPicker doesn't forward refs.
  const { className } = composableProps(props, { classNames: tx('calendar.root', {}) });
  return (
    <DayPicker
      // Spread loses union narrowing inside the function body; restore the type at the DayPicker boundary.
      {...(props as DayPickerProps)}
      className={className}
      classNames={{ ...themed, root: undefined }}
      components={{
        MonthCaption: CalendarMonthCaption,
        Nav: CalendarNav,
        ...(components ?? {}),
      }}
    />
  );
});

CalendarRoot.displayName = 'Calendar.Root';

//
// Slot defaults exposed on the namespace.
// Consumers may pass these (or their own wrappers) via DayPicker's `components` prop.
//

// The default MonthCaption is rendered inside the nav (see CalendarNav); hide the per-month caption.
const CalendarMonthCaption: CustomComponents['MonthCaption'] = () => <span hidden />;

const CalendarNav: CustomComponents['Nav'] = ({
  onPreviousClick,
  onNextClick,
  previousMonth,
  nextMonth,
  ...rest
}: NavProps) => {
  const { t } = useTranslation(translationKey);
  const { months } = useDayPicker();
  const displayed = months[0]?.date;
  return (
    <nav {...rest}>
      <IconButton
        variant='ghost'
        iconOnly
        icon='ph--caret-left--regular'
        label={t('calendar.nav.previous.label')}
        disabled={!previousMonth}
        onClick={onPreviousClick}
      />
      <span className='text-sm font-medium'>
        {displayed?.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
      </span>
      <IconButton
        variant='ghost'
        iconOnly
        icon='ph--caret-right--regular'
        label={t('calendar.nav.next.label')}
        disabled={!nextMonth}
        onClick={onNextClick}
      />
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
