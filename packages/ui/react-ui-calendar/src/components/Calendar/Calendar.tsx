//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { type Day, addDays, differenceInWeeks, format, startOfDay, startOfWeek } from 'date-fns';
import React, {
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
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
import { IconButton, useTranslation } from '@dxos/react-ui';
import { composable, composableProps, mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { getDate, isSameDay } from './util';

const maxRows = 50 * 100;
const start = new Date('1970-01-01');
const size = 48;
const defaultWidth = 7 * size;

//
// Range
//

/**
 * Inclusive date range. `from <= to`. Both endpoints are anchored at the
 * start of their day; callers should not rely on time-of-day precision.
 */
export type Range = {
  from: Date;
  to: Date;
};

/** Normalize an ordered pair of dates into a Range (start-of-day, from <= to). */
const makeRange = (a: Date, b: Date): Range => {
  const dayA = startOfDay(a);
  const dayB = startOfDay(b);
  return dayA <= dayB ? { from: dayA, to: dayB } : { from: dayB, to: dayA };
};

/** Inclusive day-level membership check. */
const isInRange = (date: Date, range: Range | undefined): boolean => {
  if (!range) {
    return false;
  }
  const day = startOfDay(date).getTime();
  return day >= range.from.getTime() && day <= range.to.getTime();
};

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
  /** Committed date range, set by the most recent drag selection. */
  range: Range | undefined;
  setRange: Dispatch<SetStateAction<Range | undefined>>;
  /** Live drag preview; non-undefined only while the user is dragging. */
  pendingRange: Range | undefined;
  setPendingRange: Dispatch<SetStateAction<Range | undefined>>;
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
    const [range, setRange] = useState<Range | undefined>();
    const [pendingRange, setPendingRange] = useState<Range | undefined>();

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
        range={range}
        setRange={setRange}
        pendingRange={pendingRange}
        setPendingRange={setPendingRange}
      >
        {children}
      </CalendarContextProvider>
    );
  },
);

//
// Header
//

const CALENDAR_TOOLBAR_NAME = 'CalendarHeader';

type CalendarToolbarProps = {};

const CalendarToolbar = composable<HTMLDivElement, CalendarToolbarProps>(({ classNames, ...props }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const { weekStartsOn, event, index, selected } = useCalendarContext(CALENDAR_TOOLBAR_NAME);
  const top = useMemo(() => getDate(start, index ?? 0, 6, weekStartsOn), [index, weekStartsOn]);
  const today = useMemo(() => new Date(), []);

  const handleToday = useCallback(() => {
    event.emit({ type: 'scroll', date: today });
  }, [event, start, today]);

  return (
    <div
      {...composableProps(props, {
        role: 'none',
        classNames: ['shrink-0 grid! grid-cols-3 items-center bg-toolbar-surface', classNames],
      })}
      ref={forwardedRef}
      style={{ width: defaultWidth }}
    >
      <div className='flex justify-start'>
        <IconButton
          variant='ghost'
          icon='ph--calendar--regular'
          iconOnly
          classNames='aspect-square'
          label={t('today.button')}
          onClick={handleToday}
        />
      </div>
      <div className='flex justify-center p-2 text-description'>{format(selected ?? top, 'MMMM')}</div>
      <div className='flex justify-end p-2 text-description'>{(selected ?? top).getFullYear()}</div>
    </div>
  );
});

CalendarToolbar.displayName = CALENDAR_TOOLBAR_NAME;

//
// Grid
// TODO(burdon): Key nav.
//

const CALENDAR_GRID_NAME = 'CalendarGrid';

type CalendarGridProps = {
  rows?: number;
  /** Dates to highlight on the grid. Each date that appears in this array receives a border indicator. */
  dates?: Date[];
  /** Fired when a user clicks a single date (no drag). */
  onSelect?: (event: { date: Date }) => void;
  /**
   * Fired when a user completes a drag across multiple days. Not fired on a
   * single-click (use {@link onSelect} for that). The range is normalized:
   * `from <= to`, both at start-of-day.
   */
  onSelectRange?: (event: { range: Range }) => void;
};

const CalendarGrid = composable<HTMLDivElement, CalendarGridProps>(
  ({ classNames, rows, dates = [], onSelect, onSelectRange, ...props }, forwardedRef) => {
    const { weekStartsOn, event, setIndex, selected, setSelected, range, setRange, pendingRange, setPendingRange } =
      useCalendarContext(CALENDAR_GRID_NAME);
    const { ref: containerRef, width = 0, height = 0 } = useResizeDetector();
    const maxHeight = rows ? rows * size : undefined;
    const listRef = useRef<List>(null);
    const today = useMemo(() => new Date(), []);

    // Build a set of ISO date strings (YYYY-MM-DD) for O(1) per-cell lookup.
    const dateSet = useMemo(() => new Set(dates.map((date) => startOfDay(date).toISOString())), [dates]);

    const hasDate = useCallback((date: Date) => dateSet.has(startOfDay(date).toISOString()), [dateSet]);

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

    //
    // Drag-to-select range.
    //
    // Pointer down on a cell anchors the drag. Pointer enter on any cell while
    // dragging updates the pending range. Pointer up on a cell commits: if the
    // anchor and release are the same day, this is treated as a single-click
    // selection (fires onSelect); otherwise it commits a range (fires
    // onSelectRange). A global pointer-up listener cancels the drag when
    // released outside the grid.
    //
    const dragAnchorRef = useRef<Date | undefined>(undefined);

    const handleDayPointerDown = useCallback(
      (date: Date, ev: ReactPointerEvent<HTMLDivElement>) => {
        // Prevent text selection while dragging.
        ev.preventDefault();
        dragAnchorRef.current = date;
        // Immediate visual feedback: render the single-select ring on the anchor
        // day. If the pointer enters another cell we'll promote to a range.
        setRange(undefined);
        setSelected(date);
      },
      [setRange, setSelected],
    );

    const handleDayPointerEnter = useCallback(
      (date: Date) => {
        const anchor = dragAnchorRef.current;
        if (!anchor) {
          return;
        }
        if (isSameDay(anchor, date)) {
          // Still on the anchor cell — keep the single-select ring, no range yet.
          setPendingRange(undefined);
          return;
        }
        // Pointer has moved to a different cell — promote to range and clear
        // the single-select ring.
        setSelected(undefined);
        setPendingRange(makeRange(anchor, date));
      },
      [setPendingRange, setSelected],
    );

    const handleDayPointerUp = useCallback(
      (date: Date) => {
        const anchor = dragAnchorRef.current;
        dragAnchorRef.current = undefined;
        setPendingRange(undefined);
        if (!anchor) {
          return;
        }
        if (isSameDay(anchor, date)) {
          // Single click — `selected` was already set on pointerdown.
          onSelect?.({ date });
          return;
        }
        // Drag commit — `selected` was already cleared by pointerenter.
        const committed = makeRange(anchor, date);
        setRange(committed);
        onSelectRange?.({ range: committed });
      },
      [onSelect, onSelectRange, setPendingRange, setRange],
    );

    // Cancel drag if the pointer is released outside the grid.
    useEffect(() => {
      const cancel = () => {
        if (dragAnchorRef.current) {
          dragAnchorRef.current = undefined;
          setPendingRange(undefined);
        }
      };
      window.addEventListener('pointerup', cancel);
      window.addEventListener('pointercancel', cancel);
      return () => {
        window.removeEventListener('pointerup', cancel);
        window.removeEventListener('pointercancel', cancel);
      };
    }, [setPendingRange]);

    const activeRange = pendingRange ?? range;

    const handleScroll = useCallback<NonNullable<ListProps['onScroll']>>((info) => {
      setIndex(Math.round(info.scrollTop / size));
    }, []);

    const rowRenderer = useCallback<ListRowRenderer>(
      ({ key, index, style }) => {
        const getBgColor = (date: Date) => date.getMonth() % 2 === 0 && 'bg-modal-surface';
        return (
          <div key={key} style={style} className='grid'>
            <div className='grid grid-cols-7 bg-input-surface' style={{ gridTemplateColumns: `repeat(7, ${size}px)` }}>
              {Array.from({ length: 7 }).map((_, i) => {
                const date = getDate(start, index, i, weekStartsOn);
                const inRange = isInRange(date, activeRange);
                const border = isSameDay(date, selected)
                  ? 'border-primary-500'
                  : isSameDay(date, today)
                    ? 'border-amber-500'
                    : hasDate(date)
                      ? 'border-neutral-700 border-dashed'
                      : undefined;

                return (
                  <div
                    key={i}
                    className={mx(
                      'relative flex justify-center items-center cursor-pointer select-none',
                      getBgColor(date),
                    )}
                    onPointerDown={(ev) => handleDayPointerDown(date, ev)}
                    onPointerEnter={() => handleDayPointerEnter(date)}
                    onPointerUp={() => handleDayPointerUp(date)}
                  >
                    {inRange && <div className='absolute inset-0 bg-primary-500/20' />}
                    <span className='relative text-description'>{date.getDate()}</span>
                    {!border && date.getDate() === 1 && (
                      <span className='absolute top-0 text-xs text-description'>{format(date, 'MMM')}</span>
                    )}
                    {border && <div className={mx('absolute inset-1 border-2 rounded-full', border)} />}
                  </div>
                );
              })}
            </div>
          </div>
        );
      },
      [activeRange, handleDayPointerDown, handleDayPointerEnter, handleDayPointerUp, hasDate, selected, weekStartsOn],
    );

    return (
      <div
        {...composableProps(props, {
          role: 'none',
          classNames: ['flex flex-col h-full w-full justify-center overflow-hidden', classNames],
        })}
        ref={forwardedRef}
      >
        {/* Day of week labels */}
        <div className='grid w-full grid-cols-7' style={{ width: defaultWidth }}>
          {days.map((date, i) => (
            <div key={i} className='flex justify-center p-2 text-sm font-thin'>
              {date}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className='flex flex-col h-full w-full justify-center overflow-hidden' ref={containerRef}>
          <List
            ref={listRef}
            role='none'
            className='scrollbar-none outline-hidden'
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
  },
);

CalendarGrid.displayName = CALENDAR_GRID_NAME;

//
// Calendar
//

export const Calendar = {
  Root: CalendarRoot,
  Toolbar: CalendarToolbar,
  Grid: CalendarGrid,
};

export type { CalendarController, CalendarRootProps, CalendarToolbarProps, CalendarGridProps };
