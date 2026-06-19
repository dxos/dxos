//
// Copyright 2025 DXOS.org
//

import { type Day, addDays, format, startOfWeek } from 'date-fns';
import React, { useMemo } from 'react';

import { mx } from '@dxos/ui-theme';

import { isSameDay } from './util';

export type WeekdaysProps = {
  weekStartsOn: Day;
  /** Fixed column width in px (e.g. the month grid's cells); omit for flexible `1fr` columns. */
  columnWidth?: number;
  /** Leading spacer width in px, aligning the labels over a body gutter (e.g. the week view's hour column). */
  gutter?: number;
  /** When provided, the matching day-of-month number is rendered beneath each label (week view). */
  dates?: Date[];
};

/**
 * Shared day-of-week header for the calendar views. Renders seven short day labels
 * ordered by `weekStartsOn`; when `dates` is supplied it also shows the day number and
 * highlights today.
 */
export const Weekdays = ({ weekStartsOn, columnWidth, gutter, dates }: WeekdaysProps) => {
  const labels = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn });
    return Array.from({ length: 7 }, (_, index) => format(addDays(weekStart, index), 'EEE'));
  }, [weekStartsOn]);

  const today = useMemo(() => new Date(), []);
  const columnTemplate = columnWidth ? `repeat(7, ${columnWidth}px)` : 'repeat(7, 1fr)';

  return (
    <div
      className='grid w-full shrink-0'
      style={{ gridTemplateColumns: gutter ? `${gutter}px ${columnTemplate}` : columnTemplate }}
    >
      {gutter != null && <div aria-hidden />}
      {labels.map((label, index) => {
        const date = dates?.[index];
        const isToday = !!date && isSameDay(date, today);
        return (
          <div
            key={index}
            className={mx('flex flex-col items-center p-2 text-sm font-thin', isToday && 'text-accent-text')}
          >
            <span>{label}</span>
            {date && <span className='text-lg font-normal tabular-nums'>{date.getDate()}</span>}
          </div>
        );
      })}
    </div>
  );
};
