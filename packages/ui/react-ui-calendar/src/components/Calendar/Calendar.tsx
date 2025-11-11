//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { type Day, addDays, differenceInWeeks, format, startOfWeek } from 'date-fns';
import React, {
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { List, type ListProps, type ListRowRenderer } from 'react-virtualized';

import { Event } from '@dxos/async';
import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { translationKey } from '../../translations';

import { getDate, isSameDay } from './util';

const maxRows = 50 * 100;
const start = new Date('1970-01-01');
const size = 48;
const defaultWidth = 7 * size;

//
// Context
//

type CalendarEvent = {
  type: 'scroll';
  date: Date;
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
// Controller
//

type CalendarController = {
  scrollTo: (date: Date) => void;
};

//
// Root
//

type CalendarRootProps = PropsWithChildren<Partial<Pick<CalendarContextValue, 'weekStartsOn'>>>;

const CalendarRoot = forwardRef<CalendarController, CalendarRootProps>(
  ({ children, weekStartsOn = 1 }, forwardedRef) => {
    const event = useMemo(() => new Event<CalendarEvent>(), []);
    const [selected, setSelected] = useState<Date | undefined>();
    const [index, setIndex] = useState<number | undefined>();

    useImperativeHandle(
      forwardedRef,
      () => ({
        scrollTo: (date: Date) => {
          event.emit({ type: 'scroll', date });
        },
      }),
      [event],
    );

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
  },
);

//
// Viewport
//

type CalendarViewportProps = PropsWithChildren<ThemedClassName>;

const CalendarViewport = ({ children, classNames }: CalendarViewportProps) => {
  return (
    <div role='none' className={mx('flex flex-col items-center overflow-hidden bg-inputSurface', classNames)}>
      {children}
    </div>
  );
};

CalendarViewport.displayName = 'CalendarContent';

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
    event.emit({ type: 'scroll', date: today });
  }, [event, start, today]);

  return (
    <div role='none' className={mx('shink-0 is-full grid grid-cols-3', classNames)} style={{ width: defaultWidth }}>
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
// Grid
// TODO(burdon): Key nav.
// TODO(burdon): Drag range.
//

type CalendarGridProps = ThemedClassName<{
  rows?: number;
  onSelect?: (event: { date: Date }) => void;
}>;

const CalendarGrid = ({ classNames, rows, onSelect }: CalendarGridProps) => {
  const { weekStartsOn, event, setIndex, selected, setSelected } = useCalendarContext(CalendarGrid.displayName);
  const { ref: containerRef, width = 0, height = 0 } = useResizeDetector();
  const maxHeight = rows ? rows * size : undefined;
  const listRef = useRef<List>(null);
  const today = useMemo(() => new Date(), []);

  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    const index = differenceInWeeks(today, start);
    listRef.current?.scrollToRow(index);
  }, [initialized, start, today]);

  useEffect(() => {
    return event.on((event) => {
      switch (event.type) {
        case 'scroll': {
          const index = differenceInWeeks(event.date, start);
          listRef.current?.scrollToRow(index);
          break;
        }
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

  const handleDaySelect = useCallback(
    (date: Date) => {
      setSelected((current) => (isSameDay(date, current) ? undefined : date));
      onSelect?.({ date });
    },
    [onSelect],
  );

  const handleScroll = useCallback<NonNullable<ListProps['onScroll']>>((info) => {
    setIndex(Math.round(info.scrollTop / size));
  }, []);

  const rowRenderer = useCallback<ListRowRenderer>(
    ({ key, index, style }) => {
      const getBgColor = (date: Date) => date.getMonth() % 2 === 0 && 'bg-modalSurface';
      return (
        <div key={key} style={style} className='is-full grid grid-cols-[1fr_max-content_1fr] snap-center'>
          <div className={mx(getBgColor(getDate(start, index, 0, weekStartsOn)))} />
          <div className='grid grid-cols-7' style={{ gridTemplateColumns: `repeat(7, ${size}px)` }}>
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
                  className={mx('relative flex justify-center items-center cursor-pointer', getBgColor(date))}
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
          <div className={mx(getBgColor(getDate(start, index, 6, weekStartsOn)))} />
        </div>
      );
    },
    [handleDaySelect, selected, weekStartsOn],
  );

  return (
    <div role='none' className={mx('flex flex-col bs-full is-full justify-center overflow-hidden', classNames)}>
      {/* Day labels */}
      <div role='none' className='flex justify-center bg-groupSurface'>
        <div role='none' className='flex is-full grid grid-cols-7' style={{ width: defaultWidth }}>
          {days.map((date, i) => (
            <div key={i} role='none' className='flex justify-center p-2 text-sm font-thin'>
              {date}
            </div>
          ))}
        </div>
      </div>
      {/* Grid */}
      <div role='none' className='flex flex-col bs-full is-full justify-center overflow-hidden' ref={containerRef}>
        <List
          ref={listRef}
          role='none'
          // TODO(burdon): Snap isn't working.
          className='[&>div]:snap-y scrollbar-none outline-none'
          width={width}
          height={maxHeight ?? height}
          rowCount={maxRows}
          rowHeight={size}
          rowRenderer={rowRenderer}
          scrollToAlignment='start'
          onScroll={handleScroll}
          onRowsRendered={() => setInitialized(true)}
        />
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
  Viewport: CalendarViewport,
  Header: CalendarHeader,
  Grid: CalendarGrid,
};

export type { CalendarController, CalendarRootProps, CalendarViewportProps, CalendarHeaderProps, CalendarGridProps };
