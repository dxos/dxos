//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { type Day, addDays, differenceInWeeks, format, startOfWeek } from 'date-fns';
import React, {
  type CSSProperties,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { List, type ListProps } from 'react-virtualized';

import { Event } from '@dxos/async';
import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { translationKey } from '../../translations';

import { getDate, isSameDay } from './util';

const rows = 50 * 100;
const start = new Date('1970-01-01');
const size = 48;

//
// Context
//

type CalendarEvent = {
  type: 'scroll';
  index: number;
};

type CalendarContextValue = {
  weekStartsOn: Day;
  event: Event<CalendarEvent>;
  index: number | undefined;
  setIndex: Dispatch<SetStateAction<number | undefined>>;
  selected: Date | undefined;
  setSelected: Dispatch<SetStateAction<Date | undefined>>;
};

const [CalendarContextProvider, useCalendarContext] = createContext<CalendarContextValue>('Calendar');

//
// Root
//

type CalendarRootProps = PropsWithChildren<Partial<Pick<CalendarContextValue, 'weekStartsOn'>>>;

const CalendarRoot = ({ children, weekStartsOn = 1 }: CalendarRootProps) => {
  const event = useMemo(() => new Event<CalendarEvent>(), []);
  const [selected, setSelected] = useState<Date | undefined>();
  const [index, setIndex] = useState<number | undefined>();

  return (
    <CalendarContextProvider
      weekStartsOn={weekStartsOn}
      event={event}
      index={index}
      setIndex={setIndex}
      selected={selected}
      setSelected={setSelected}
    >
      {children}
    </CalendarContextProvider>
  );
};

//
// Header
//

type CalendarHeaderProps = ThemedClassName;

const CalendarHeader = ({ classNames }: CalendarHeaderProps) => {
  const { t } = useTranslation(translationKey);
  const { weekStartsOn, event, index, selected } = useCalendarContext(CalendarHeader.displayName);
  const top = useMemo(() => getDate(start, index ?? 0, 6, weekStartsOn), [index, weekStartsOn]);
  const today = useMemo(() => new Date(), []);

  const handleToday = useCallback(() => {
    const index = differenceInWeeks(today, start);
    event.emit({ type: 'scroll', index });
  }, [event, start, today]);

  return (
    <div role='none' className={mx('shink-0 is-full grid grid-cols-3', classNames)}>
      <div className='flex justify-start'>
        <IconButton
          variant='ghost'
          size={6}
          icon='ph--calendar--regular'
          iconOnly
          classNames='aspect-square'
          label={t('today button')}
          onClick={handleToday}
        />
      </div>
      <span className='flex justify-center p-2'>{format(selected ?? top, 'MMMM')}</span>
      <span className='flex justify-end p-2'>{(selected ?? top).getFullYear()}</span>
    </div>
  );
};

CalendarHeader.displayName = 'CalendarHeader';

//
// Content
//

type CalendarContentProps = PropsWithChildren<ThemedClassName>;

const CalendarContent = ({ children, classNames }: CalendarContentProps) => {
  return (
    <div role='none' className={mx('flex flex-col grow bg-inputSurface', classNames)} style={{ width: 7 * size }}>
      {children}
    </div>
  );
};

CalendarContent.displayName = 'CalendarContent';

//
// Grid
//

type CalendarGridProps = ThemedClassName<{
  grow?: boolean;
  numRows?: number;
}>;

// TODO(burdon): Key nav.
// TODO(burdon): Drag range.
// TODO(burdon): Snap scrolling.
const CalendarGrid = ({ classNames, grow, numRows = 7 }: CalendarGridProps) => {
  const { weekStartsOn, event, setIndex, selected, setSelected } = useCalendarContext(CalendarGrid.displayName);
  const { ref, height = 0 } = useResizeDetector();
  const listRef = useRef<List>(null);
  const today = useMemo(() => new Date(), []);
  const maxHeight = grow ? undefined : numRows * size;

  useEffect(() => {
    return event.on((event) => {
      switch (event.type) {
        case 'scroll':
          listRef.current?.scrollToRow(event.index);
          break;
      }
    });
  }, [event]);

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

  const handleScroll = useCallback<NonNullable<ListProps['onScroll']>>((info) => {
    setIndex(Math.round(info.scrollTop / size));
  }, []);

  const rowRenderer = useCallback(
    ({ key, index, style }: { key: string; index: number; style: CSSProperties }) => {
      return (
        <div key={key} style={style} className='is-full grid grid-cols-7 snap-center'>
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
      role='none'
      className={mx('flex flex-col bs-full is-full overflow-hidden bg-modalSurface', classNames)}
      style={{ width: days.length * size }}
    >
      {/* Day labels */}
      <div role='none' className='flex shink-0 is-full grid grid-cols-7'>
        {days.map((date, i) => (
          <div key={i} className='flex justify-center p-2 text-sm font-thin'>
            {date}
          </div>
        ))}
      </div>
      {/* Grid */}
      <div role='none' ref={ref} className='flex grow bg-inputSurface' style={{ height: maxHeight }}>
        {height > 0 && (
          <List
            ref={listRef}
            role='none'
            // TODO(burdon): Snap isn't working.
            className='[&>div]:snap-y scrollbar-none'
            width={days.length * size}
            height={maxHeight ?? height}
            rowCount={rows}
            rowHeight={size}
            rowRenderer={rowRenderer}
            scrollToAlignment='center'
            onScroll={handleScroll}
          />
        )}
      </div>
    </div>
  );
};

CalendarGrid.displayName = 'CalendarGrid';

//
// Calendar
//

export const Calendar = {
  Root: CalendarRoot,
  Header: CalendarHeader,
  Content: CalendarContent,
  Grid: CalendarGrid,
};

export type { CalendarRootProps, CalendarHeaderProps, CalendarContentProps, CalendarGridProps };
