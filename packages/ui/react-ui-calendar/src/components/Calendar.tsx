//
// Copyright 2025 DXOS.org
//

import { type Day, addDays, differenceInWeeks, format, startOfWeek } from 'date-fns';
import React, { type CSSProperties, useCallback, useMemo, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { List, type ListProps } from 'react-virtualized';

import { Button, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { translationKey } from '../translations';

const getDate = (start: Date, weekNumber: number, dayOfWeek: number, weekStartsOn: Day): Date => {
  const result = new Date(start);
  const startDayOfWeek = start.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const adjustedStartDay = (startDayOfWeek === 0 ? 7 : startDayOfWeek) - weekStartsOn; // Adjust for weekStartsOn.
  result.setDate(start.getDate() - adjustedStartDay + weekNumber * 7 + dayOfWeek);
  return result;
};

const isSameDay = (date1: Date, date2: Date | undefined): boolean => {
  return (
    !!date2 &&
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const rows = 50 * 100;
const start = new Date('1970-01-01');
const size = 48;

export type CalendarProps = ThemedClassName<{
  weekStartsOn?: Day;
  numRows?: number;
}>;

// TODO(burdon): Key nav.
// TODO(burdon): Drag range.
// TODO(burdon): Snap scrolling.
export const Calendar = ({ classNames, weekStartsOn = 1, numRows = 7 }: CalendarProps) => {
  const { t } = useTranslation(translationKey);
  const { ref, height = 0 } = useResizeDetector();
  const listRef = useRef<List>(null);
  const [selected, setSelected] = useState<Date | undefined>();
  const [index, setIndex] = useState<number | undefined>(undefined);
  const today = useMemo(() => new Date(), []);
  const top = useMemo(() => getDate(start, index ?? 0, 6, weekStartsOn), [index, weekStartsOn]);

  const days = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn });
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i);
      return format(day, 'EEE'); // Short day name (Mon, Tue, etc.)
    });
  }, []);

  const handleDaySelect = useCallback((date: Date) => {
    setSelected((current) => (isSameDay(date, current) ? undefined : date));
  }, []);

  const handleToday = useCallback(() => {
    const week = differenceInWeeks(today, start);
    listRef.current?.scrollToRow(week);
  }, [start, today]);

  const handleScroll = useCallback<NonNullable<ListProps['onScroll']>>((info) => {
    setIndex(Math.round(info.scrollTop / size));
  }, []);

  const rowRenderer = useCallback(
    ({ key, index, style }: { key: string; index: number; style: CSSProperties }) => {
      return (
        <div key={key} style={style} className='is-full grid grid-cols-7'>
          {Array.from({ length: 7 }).map((_, i) => {
            const date = getDate(start, index, i, weekStartsOn);
            const border = isSameDay(date, selected)
              ? 'border-primary-500'
              : isSameDay(date, today)
                ? 'border-amber-500'
                : undefined;
            return (
              <div
                key={i}
                className={mx(
                  'relative flex justify-center items-center cursor-pointer',
                  date.getMonth() % 2 === 0 ? 'bg-modalSurface' : '',
                )}
                onClick={() => handleDaySelect(date)}
              >
                <span className='text-description'>{date.getDate()}</span>

                {!border && date.getDate() === 1 && (
                  <span className='absolute top-0 text-xs text-description'>{format(date, 'MMM')}</span>
                )}

                {border && (
                  <div className={mx('absolute top-0 left-0 is-full bs-full border-2 rounded-full', border)} />
                )}
              </div>
            );
          })}
        </div>
      );
    },
    [handleDaySelect, selected, weekStartsOn],
  );

  return (
    <div
      className={mx('flex flex-col bs-full is-full overflow-hidden bg-modalSurface', classNames)}
      style={{ width: days.length * size }}
    >
      {/* Month */}
      <div className='flex shink-0 is-full flex justify-between p-2 gap-2'>
        <span>{format(selected ?? top, 'MMMM')}</span>
        <span>{(selected ?? top).getFullYear()}</span>
      </div>
      {/* Days */}
      <div className='flex shink-0 is-full grid grid-cols-7'>
        {days.map((date, i) => (
          <div key={i} className='flex justify-center p-2 text-sm font-thin'>
            {date}
          </div>
        ))}
      </div>
      {/* Grid */}
      <div role='none' ref={ref} className='flex grow bg-inputSurface' style={{ minHeight: numRows * size }}>
        {height > 0 && (
          <List
            ref={listRef}
            role='none'
            className='scrollbar-none'
            width={days.length * size}
            height={numRows * size}
            rowCount={rows}
            rowHeight={size}
            rowRenderer={rowRenderer}
            scrollToAlignment='center'
            onScroll={handleScroll}
          />
        )}
      </div>
      {/* Buttons */}
      <Button variant='ghost' classNames='shrink-0 p-2' onClick={handleToday}>
        {t('today button')}
      </Button>
    </div>
  );
};
