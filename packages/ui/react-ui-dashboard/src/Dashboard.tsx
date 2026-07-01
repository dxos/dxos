//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type PropsWithChildren, forwardRef, useCallback, useMemo } from 'react';

import {
  type ComposableProps,
  type SlottableProps,
  type ThemedClassName,
  ToggleGroup,
  ToggleGroupItem,
  type ToggleGroupItemProps,
  composable,
  composableProps,
  slottable,
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { type UnitFormat } from '@dxos/util';

import { type ActivityDatum, buildCalendar } from './util';

const DASHBOARD_NAME = 'Dashboard';

//
// Context
//

type DashboardContextValue = {
  range?: string;
  setRange: (range: string) => void;
};

const [DashboardContextProvider, useDashboardContext] = createContext<DashboardContextValue>(DASHBOARD_NAME, {
  setRange: () => {},
});

//
// Root
//

type DashboardRootProps = PropsWithChildren<{
  range?: string;
  defaultRange?: string;
  onRangeChange?: (range: string) => void;
}>;

/**
 * Headless provider holding the selected date range; renders no DOM.
 */
const DashboardRoot = ({ range: propsRange, defaultRange, onRangeChange, children }: DashboardRootProps) => {
  const [range, setRange] = useControllableState({
    prop: propsRange,
    onChange: onRangeChange,
    defaultProp: defaultRange,
  });

  return (
    <DashboardContextProvider range={range} setRange={setRange}>
      {children}
    </DashboardContextProvider>
  );
};

DashboardRoot.displayName = 'Dashboard.Root';

//
// Content
//

type DashboardContentProps = SlottableProps;

const DashboardContent = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const Comp = asChild ? Slot : Primitive.div;
  return (
    <Comp {...composableProps(props, { classNames: 'grid content-start gap-2 p-2' })} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

DashboardContent.displayName = 'Dashboard.Content';

//
// Stats
//

type DashboardStatsProps = SlottableProps;

const DashboardStats = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const Comp = asChild ? Slot : Primitive.div;
  return (
    <Comp
      {...composableProps(props, { classNames: 'grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-2' })}
      ref={forwardedRef}
    >
      {children}
    </Comp>
  );
});

DashboardStats.displayName = 'Dashboard.Stats';

//
// Stat
//

type DashboardStatProps = SlottableProps;

const DashboardStat = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const Comp = asChild ? Slot : Primitive.div;
  return (
    <Comp
      {...composableProps(props, { classNames: 'flex min-w-0 flex-col gap-1 rounded-sm bg-group-surface p-2' })}
      ref={forwardedRef}
    >
      {children}
    </Comp>
  );
});

DashboardStat.displayName = 'Dashboard.Stat';

//
// StatLabel
//

type DashboardStatLabelProps = ComposableProps;

const DashboardStatLabel = composable<HTMLSpanElement>(({ children, ...props }, forwardedRef) => (
  <span {...composableProps(props, { classNames: 'truncate text-sm text-description' })} ref={forwardedRef}>
    {children}
  </span>
));

DashboardStatLabel.displayName = 'Dashboard.StatLabel';

//
// StatValue
//

type DashboardStatValueCustomProps = {
  value?: number | string;
  /** Formats numeric values (e.g., `Unit.Million`); plain numbers fall back to locale formatting. */
  unit?: UnitFormat;
};

type DashboardStatValueProps = ComposableProps<DashboardStatValueCustomProps>;

const DashboardStatValue = composable<HTMLSpanElement, DashboardStatValueCustomProps>(
  ({ children, value, unit, ...props }, forwardedRef) => {
    const content = typeof value === 'number' ? (unit ? unit(value).toString() : value.toLocaleString()) : value;
    return (
      <span {...composableProps(props, { classNames: 'truncate text-xl font-medium text-base-fg' })} ref={forwardedRef}>
        {content ?? children}
      </span>
    );
  },
);

DashboardStatValue.displayName = 'Dashboard.StatValue';

//
// Ranges
//

type DashboardRangesProps = ThemedClassName<PropsWithChildren<{}>>;

const DashboardRanges = forwardRef<HTMLDivElement, DashboardRangesProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    const { range, setRange } = useDashboardContext('Dashboard.Ranges');
    const handleValueChange = useCallback(
      (value: string) => {
        if (value) {
          setRange(value);
        }
      },
      [setRange],
    );

    return (
      <ToggleGroup
        {...props}
        type='single'
        value={range ?? ''}
        onValueChange={handleValueChange}
        classNames={classNames}
        ref={forwardedRef}
      >
        {children}
      </ToggleGroup>
    );
  },
);

DashboardRanges.displayName = 'Dashboard.Ranges';

//
// Range
//

type DashboardRangeProps = ToggleGroupItemProps;

const DashboardRange = forwardRef<HTMLButtonElement, DashboardRangeProps>(
  ({ variant = 'ghost', density = 'sm', ...props }, forwardedRef) => (
    <ToggleGroupItem {...props} variant={variant} density={density} ref={forwardedRef} />
  ),
);

DashboardRange.displayName = 'Dashboard.Range';

//
// Activity
//

const activityLevels = [
  'bg-hover-surface',
  'bg-primary-500/60',
  'bg-primary-500/70',
  'bg-primary-500/80',
  'bg-primary-500/90',
];

// Rows of a Monday-first week.
const dayLabelRows = [0, 1, 2, 3, 4, 5, 6];

// 2026-01-05 is a Monday; used only to derive localized weekday names.
const referenceMonday = new Date(2026, 0, 5);

type DashboardActivityCustomProps = {
  data: readonly ActivityDatum[];
  /** Number of week columns. */
  weeks?: number;
  /** Last day of the matrix; defaults to the most recent datum. */
  endDate?: Date | string;
  locale?: string | string[];
};

type DashboardActivityProps = ComposableProps<DashboardActivityCustomProps>;

/**
 * GitHub-style activity matrix: week columns by day rows, colored by intensity.
 */
const DashboardActivity = composable<HTMLDivElement, DashboardActivityCustomProps>(
  ({ data, weeks = 52, endDate, locale, children: _children, ...props }, forwardedRef) => {
    const calendar = useMemo(() => buildCalendar({ data, weeks, endDate }), [data, weeks, endDate]);
    const monthFormat = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'short' }), [locale]);
    const dayFormat = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale]);

    return (
      <div
        {...composableProps(props, {
          classNames: 'grid gap-[3px] overflow-x-auto',
          // Fixed cell tracks keep cells the same size regardless of the number of weeks;
          // the label column is max-content so leftover free space is not distributed to it.
          style: { gridTemplateColumns: `max-content repeat(${weeks}, var(--dx-dashboard-cell, 0.75rem))` },
        })}
        ref={forwardedRef}
      >
        {calendar.months.map(({ weekIndex, month, year }) => (
          <span
            key={`${year}-${month}`}
            style={{ gridColumn: weekIndex + 2, gridRow: 1 }}
            className='whitespace-nowrap text-xs text-description'
          >
            {monthFormat.format(new Date(year, month, 1))}
          </span>
        ))}
        {dayLabelRows.map((day) => (
          <span
            key={day}
            style={{ gridColumn: 1, gridRow: day + 2 }}
            className='self-center pe-1 text-[10px] leading-none text-description uppercase font-mono'
          >
            {dayFormat.format(new Date(referenceMonday.getFullYear(), 0, referenceMonday.getDate() + day))}
          </span>
        ))}
        {calendar.cells.map((cell) => (
          <span
            key={cell.key}
            style={{ gridColumn: cell.week + 2, gridRow: cell.day + 2 }}
            className={mx('aspect-square min-w-0 rounded-xs', activityLevels[cell.level])}
            data-level={cell.level}
            data-date={cell.key}
            title={`${cell.key}: ${cell.value}`}
          />
        ))}
      </div>
    );
  },
);

DashboardActivity.displayName = 'Dashboard.Activity';

//
// Dashboard
//

export const Dashboard = {
  Root: DashboardRoot,
  Content: DashboardContent,
  Stats: DashboardStats,
  Stat: DashboardStat,
  StatLabel: DashboardStatLabel,
  StatValue: DashboardStatValue,
  Ranges: DashboardRanges,
  Range: DashboardRange,
  Activity: DashboardActivity,
};

export type {
  DashboardActivityProps,
  DashboardContentProps,
  DashboardRangeProps,
  DashboardRangesProps,
  DashboardRootProps,
  DashboardStatLabelProps,
  DashboardStatProps,
  DashboardStatsProps,
  DashboardStatValueProps,
};
