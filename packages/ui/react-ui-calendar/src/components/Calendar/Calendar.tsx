//
// Copyright 2025 DXOS.org
//

import { addDays, format, startOfDay } from 'date-fns';
import React, {
  type PropsWithChildren,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { type ListProps, type ListRowRenderer, List } from 'react-virtualized';

import { Event } from '@dxos/async';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import {
  type CalendarContextValue,
  type CalendarController,
  type CalendarScrollEvent,
  type Range,
  CalendarContextProvider,
  useCalendarContext,
} from './context';
import { getDate, getRowIndex, gridEpoch, isSameDay } from './util';
import { type CalendarEvent, type CalendarWeekProps, CalendarWeek } from './Week';
import { Weekdays } from './Weekdays';

const maxRows = 50 * 100;
const start = gridEpoch;
const size = 40;
const defaultWidth = 7 * size;

// Auto-scroll while dragging near a vertical edge.
const EDGE_SCROLL_ZONE = 32; // px
const EDGE_SCROLL_MAX_SPEED = 12; // px per frame

const DATE_CLASS_NAMES = {
  current: 'ring-2 ring-primary-500',
  today: 'border-2 border-amber-500 bg-amber-500/50 text-inverse-fg',
  busy: 'border border-green-700',
  starred: 'border-2 border-dashed border-amber-500',
};

//
// Range
//

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

/** Resolve a DOM element back to the Date its cell represents. */
const cellDate = (el: Element | null): Date | undefined => {
  let current: Element | null = el;
  while (current && current !== document.body) {
    const iso = current.getAttribute?.('data-date');
    if (iso) {
      return new Date(iso);
    }
    current = current.parentElement;
  }
  return undefined;
};

//
// Root
//

type CalendarRootProps = PropsWithChildren<Partial<Pick<CalendarContextValue, 'weekStartsOn'>>>;

const CalendarRoot = forwardRef<CalendarController, CalendarRootProps>(
  ({ children, weekStartsOn = 1 }, forwardedRef) => {
    const event = useMemo(() => new Event<CalendarScrollEvent>(), []);
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
        select: (date: Date) => {
          event.emit({ type: 'select', date });
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
//

const CALENDAR_GRID_NAME = 'CalendarGrid';

/** Semantic kind of a {@link DateMarker}; the grid maps each kind to its own border treatment. */
export type DateMarkerTag = 'busy' | 'star';

/**
 * A date (or inclusive date range) to mark on the grid. */
export type DateMarker = { startDate: Date; endDate?: Date; tag?: DateMarkerTag };

type CalendarGridProps = {
  rows?: number;
  /**
   * Dates to mark on the grid; each marked day gets a border keyed off its `tag` kind (defaults to `busy`).
   */
  dates?: DateMarker[];
  /**
   * Date the grid scrolls into view on mount, and whenever this value changes.
   * Defaults to today. Pass a stable (memoized) Date so the grid does not
   * re-scroll on every render.
   */
  initialDate?: Date;
  /**
   * Weeks of context kept above a date when scrolling it into view (on mount and via the controller's
   * `scrollTo`), so the date sits below the top edge rather than pinned to it. Defaults to 2.
   */
  scrollMargin?: number;
  /** Fired when a user selects a single date (click or arrow key). */
  onSelect?: (event: { date: Date }) => void;
  /**
   * Fired when a user commits a multi-day range, either by a drag gesture or
   * by shift+arrow extension. The range is normalized: `from <= to`, both at
   * start-of-day. Not fired for single-day selections (use {@link onSelect}).
   */
  onSelectRange?: (event: { range: Range }) => void;
};

const CalendarGrid = composable<HTMLDivElement, CalendarGridProps>(
  (
    { classNames, rows, dates = [], initialDate, scrollMargin = 2, onSelect, onSelectRange, ...props },
    forwardedRef,
  ) => {
    const { weekStartsOn, event, setIndex, selected, setSelected, range, setRange, pendingRange, setPendingRange } =
      useCalendarContext(CALENDAR_GRID_NAME);
    const { ref: containerRef, width = 0, height = 0 } = useResizeDetector();
    const maxHeight = rows ? rows * size : undefined;
    const listRef = useRef<List>(null);
    const gridRef = useRef<HTMLDivElement>(null);
    const today = useMemo(() => new Date(), []);

    // Map each marked ISO day to its tag kind, expanding ranges. `star` wins over `busy` on the same
    // day so a starred event keeps its highlighted border.
    const dateMarkers = useMemo(() => {
      const markers = new Map<string, DateMarkerTag>();
      for (const { startDate, endDate, tag = 'busy' } of dates) {
        const end = endDate ? startOfDay(endDate) : startOfDay(startDate);
        for (let date = startOfDay(startDate); date <= end; date = addDays(date, 1)) {
          const iso = date.toISOString();
          if (markers.get(iso) !== 'star') {
            markers.set(iso, tag);
          }
        }
      }

      return markers;
    }, [dates]);

    const getMarker = useCallback(
      (date: Date): { tag: DateMarkerTag } | undefined => {
        const iso = startOfDay(date).toISOString();
        const tag = dateMarkers.get(iso);
        return tag ? { tag } : undefined;
      },
      [dateMarkers],
    );

    const [initialized, setInitialized] = useState(false);
    useEffect(() => {
      const index = getRowIndex(start, initialDate ?? today, weekStartsOn);
      // Keep `scrollMargin` weeks of context above the target row.
      listRef.current?.scrollToRow(Math.max(0, index - scrollMargin));
    }, [initialized, start, today, initialDate, weekStartsOn, scrollMargin]);

    useEffect(() => {
      return event.on((event) => {
        // `select` also sets the grid's selection (e.g. when the active event changes); the grid still
        // owns selection — a user click sets it locally and isn't overwritten until the next `select`.
        if (event.type === 'select') {
          setSelected(event.date);
        }
        const index = getRowIndex(start, event.date, weekStartsOn);
        listRef.current?.scrollToRow(Math.max(0, index - scrollMargin));
      });
    }, [event, start, weekStartsOn, scrollMargin, setSelected]);

    //
    // Selection refs.
    //
    // `anchorRef` is the immovable end of a range gesture (pointerdown date or
    // initial day when shift+arrow starts). `focusRef` is the moving end
    // (pointer-under-cursor during drag, or the cursor after each shift+arrow).
    // Both refs are kept in sync across mouse drag and keyboard nav so that
    // the user can fluidly mix gestures (e.g., drag a range, then shift+arrow
    // to fine-tune).
    //
    const anchorRef = useRef<Date | undefined>(undefined);
    const focusRef = useRef<Date | undefined>(undefined);
    const draggingRef = useRef(false);

    // Pointer tracking for edge-scroll while dragging.
    const pointerXRef = useRef<number>(0);
    const pointerYRef = useRef<number>(0);
    const scrollTopRef = useRef(0);
    const scrollRafRef = useRef<number | undefined>(undefined);

    // Scroll the target date into view only if it's outside the visible window.
    // Horizontal moves (left/right within the same week) leave the row index
    // unchanged and are a no-op.
    const scrollIntoView = useCallback(
      (date: Date) => {
        const targetRow = getRowIndex(start, date, weekStartsOn);
        const visibleHeight = maxHeight ?? height;
        if (!visibleHeight) {
          return;
        }
        // Rows fully inside the viewport. Use ceil/floor (not floor of scrollTop) so a partially
        // visible row at either edge counts as "not fully visible" even when scrollTop is not a
        // multiple of the row height (which it isn't after a bottom-aligned scroll).
        const firstFullyVisibleRow = Math.ceil(scrollTopRef.current / size);
        const lastFullyVisibleRow = Math.floor((scrollTopRef.current + visibleHeight) / size) - 1;
        if (targetRow < firstFullyVisibleRow) {
          // Align the top edge of the target row with the top edge of the viewport.
          listRef.current?.scrollToPosition(targetRow * size);
        } else if (targetRow > lastFullyVisibleRow) {
          // Align the bottom edge of the target row with the bottom edge of the viewport (using the
          // full visible height, not a row-rounded height, so the row sits flush against the edge).
          listRef.current?.scrollToPosition(Math.max(0, (targetRow + 1) * size - visibleHeight));
        }
      },
      [height, maxHeight, weekStartsOn],
    );

    const updateRangeFromAnchor = useCallback(
      (focus: Date, fireRange = false) => {
        const anchor = anchorRef.current;
        if (!anchor) {
          return;
        }
        focusRef.current = focus;
        if (isSameDay(anchor, focus)) {
          setRange(undefined);
          setSelected(anchor);
        } else {
          setSelected(undefined);
          const committed = makeRange(anchor, focus);
          setRange(committed);
          if (fireRange) {
            onSelectRange?.({ range: committed });
          }
        }
      },
      [onSelectRange, setRange, setSelected],
    );

    //
    // Drag-to-select range.
    //
    // `prevSelectedRef` snapshots the single-day selection that was active
    // when the gesture began. A click on the *same* already-selected day
    // toggles the selection off on pointerup; a click on any other day (or
    // when no day was selected) just sets the new selection.
    //
    const prevSelectedRef = useRef<Date | undefined>(undefined);

    const handleDayPointerDown = useCallback(
      (date: Date, ev: ReactPointerEvent<HTMLDivElement>) => {
        ev.preventDefault();
        prevSelectedRef.current = selected;
        anchorRef.current = date;
        focusRef.current = date;
        draggingRef.current = true;
        // Immediate visual feedback: render the single-select ring on the anchor day.
        setRange(undefined);
        setPendingRange(undefined);
        setSelected(date);
        // Focus the grid so subsequent keyboard nav works.
        gridRef.current?.focus({ preventScroll: true });
      },
      [selected, setPendingRange, setRange, setSelected],
    );

    const handleDayPointerEnter = useCallback(
      (date: Date) => {
        if (!draggingRef.current) {
          return;
        }
        const anchor = anchorRef.current;
        if (!anchor) {
          return;
        }
        focusRef.current = date;
        // Always render a pending range while dragging — even a single-day range
        // (when the pointer is on the anchor cell or returns to it). Otherwise
        // the anchor cell would appear empty mid-drag.
        setSelected(undefined);
        setPendingRange(makeRange(anchor, date));
      },
      [setPendingRange, setSelected],
    );

    const handleDayPointerUp = useCallback(
      (date: Date) => {
        const anchor = anchorRef.current;
        const wasDragging = draggingRef.current;
        draggingRef.current = false;
        setPendingRange(undefined);
        if (!wasDragging || !anchor) {
          return;
        }
        focusRef.current = date;
        if (isSameDay(anchor, date)) {
          // Single click — toggle off if clicking the previously-selected day,
          // otherwise set as selected. (pointerenter may have cleared the ring
          // mid-drag to show a 1-day pending-range fill; restore here.)
          if (prevSelectedRef.current && isSameDay(prevSelectedRef.current, date)) {
            setSelected(undefined);
            anchorRef.current = undefined;
            focusRef.current = undefined;
            return;
          }
          setSelected(anchor);
          onSelect?.({ date });
          return;
        }
        // Drag commit — `selected` was already cleared by pointerenter.
        const committed = makeRange(anchor, date);
        setRange(committed);
        onSelectRange?.({ range: committed });
      },
      [onSelect, onSelectRange, setPendingRange, setRange, setSelected],
    );

    // Cancel drag if the pointer is released outside the grid.
    useEffect(() => {
      const cancel = () => {
        if (draggingRef.current) {
          draggingRef.current = false;
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

    //
    // Edge auto-scroll while dragging near top/bottom of the grid viewport.
    //
    const tickEdgeScroll = useCallback(() => {
      scrollRafRef.current = undefined;
      if (!draggingRef.current) {
        return;
      }
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const y = pointerYRef.current;
      let delta = 0;
      if (y < rect.top + EDGE_SCROLL_ZONE) {
        delta = -EDGE_SCROLL_MAX_SPEED * Math.min(1, Math.max(0, (rect.top + EDGE_SCROLL_ZONE - y) / EDGE_SCROLL_ZONE));
      } else if (y > rect.bottom - EDGE_SCROLL_ZONE) {
        delta =
          EDGE_SCROLL_MAX_SPEED * Math.min(1, Math.max(0, (y - (rect.bottom - EDGE_SCROLL_ZONE)) / EDGE_SCROLL_ZONE));
      }
      if (delta !== 0) {
        const newScroll = Math.max(0, scrollTopRef.current + delta);
        listRef.current?.scrollToPosition(newScroll);
        // After scroll, the cell under the (stationary) pointer changes.
        // Look up the new cell and update the pending range accordingly.
        const date = cellDate(document.elementFromPoint(pointerXRef.current, y));
        const anchor = anchorRef.current;
        if (date && anchor) {
          focusRef.current = date;
          if (isSameDay(anchor, date)) {
            setPendingRange(undefined);
            setSelected(anchor);
          } else {
            setSelected(undefined);
            setPendingRange(makeRange(anchor, date));
          }
        }
        scrollRafRef.current = requestAnimationFrame(tickEdgeScroll);
      }
    }, [containerRef, setPendingRange, setSelected]);

    useEffect(() => {
      const handleMove = (ev: PointerEvent) => {
        if (!draggingRef.current) {
          return;
        }
        pointerXRef.current = ev.clientX;
        pointerYRef.current = ev.clientY;
        if (scrollRafRef.current === undefined) {
          scrollRafRef.current = requestAnimationFrame(tickEdgeScroll);
        }
      };
      window.addEventListener('pointermove', handleMove);
      return () => {
        window.removeEventListener('pointermove', handleMove);
        if (scrollRafRef.current !== undefined) {
          cancelAnimationFrame(scrollRafRef.current);
          scrollRafRef.current = undefined;
        }
      };
    }, [tickEdgeScroll]);

    //
    // Keyboard nav: arrow keys move single selection; shift+arrow expands range.
    //
    const handleKeyDown = useCallback(
      (ev: ReactKeyboardEvent<HTMLDivElement>) => {
        let dx = 0;
        switch (ev.key) {
          case 'ArrowLeft':
            dx = -1;
            break;
          case 'ArrowRight':
            dx = 1;
            break;
          case 'ArrowUp':
            dx = -7;
            break;
          case 'ArrowDown':
            dx = 7;
            break;
          default:
            return;
        }
        ev.preventDefault();

        if (ev.shiftKey) {
          // Bootstrap anchor/focus from current state if needed.
          let anchor = anchorRef.current;
          let focus = focusRef.current;
          if (!anchor) {
            // No prior gesture — seed from current selected/range/today.
            if (selected) {
              anchor = startOfDay(selected);
              focus = anchor;
            } else if (range) {
              anchor = range.from;
              focus = range.to;
            } else {
              anchor = startOfDay(today);
              focus = anchor;
            }
            anchorRef.current = anchor;
            focusRef.current = focus;
          }
          const newFocus = addDays(focus ?? anchor, dx);
          updateRangeFromAnchor(newFocus, true);
          scrollIntoView(newFocus);
        } else {
          // Plain arrow — move single selection; clear any range gesture state.
          const current = selected ?? focusRef.current ?? anchorRef.current ?? today;
          const next = addDays(startOfDay(current), dx);
          anchorRef.current = next;
          focusRef.current = next;
          setRange(undefined);
          setPendingRange(undefined);
          setSelected(next);
          onSelect?.({ date: next });
          scrollIntoView(next);
        }
      },
      [onSelect, range, scrollIntoView, selected, setPendingRange, setRange, setSelected, today, updateRangeFromAnchor],
    );

    const activeRange = pendingRange ?? range;

    const handleScroll = useCallback<NonNullable<ListProps['onScroll']>>((info) => {
      scrollTopRef.current = info.scrollTop;
      setIndex(Math.round(info.scrollTop / size));
    }, []);

    const rowRenderer = useCallback<ListRowRenderer>(
      ({ key, index, style }) => {
        // Zebra-stripe alternating months with a subtle neutral overlay over the grid surface, so
        // the banding is independent of (and robust to) surface-token retuning.
        const getBgColor = (date: Date) => (date.getMonth() % 2 === 0 ? 'bg-group-surface' : 'bg-group-alt-surface');

        return (
          <div key={key} style={style} className='grid'>
            <div className='grid grid-cols-7 bg-input-surface' style={{ gridTemplateColumns: `repeat(7, ${size}px)` }}>
              {Array.from({ length: 7 }).map((_, i) => {
                const date = getDate(start, index, i, weekStartsOn);
                const marker = getMarker(date);
                const isToday = isSameDay(date, today);
                const isCurrent = isSameDay(date, selected);
                const dateClassNames = isToday
                  ? DATE_CLASS_NAMES.today
                  : marker?.tag === 'star'
                    ? DATE_CLASS_NAMES.starred
                    : marker
                      ? DATE_CLASS_NAMES.busy
                      : undefined;

                const inRange = isInRange(date, activeRange);

                return (
                  <div
                    key={i}
                    data-date={startOfDay(date).toISOString()}
                    className={mx('relative flex justify-center cursor-pointer select-none', getBgColor(date))}
                    onPointerDown={(ev) => handleDayPointerDown(date, ev)}
                    onPointerEnter={() => handleDayPointerEnter(date)}
                    onPointerUp={() => handleDayPointerUp(date)}
                  >
                    {/* Selection range */}
                    {inRange && <div className='absolute inset-0 bg-primary-500/20' />}
                    {/* Month */}
                    {!dateClassNames && date.getDate() === 1 && (
                      <span className='absolute top-0 text-xs text-description'>{format(date, 'MMM')}</span>
                    )}
                    {/* Day + Marker */}
                    <div
                      className={mx(
                        'absolute inset-1 rounded-full flex justify-center items-center text-sm text-description',
                        dateClassNames,
                      )}
                    >
                      {date.getDate()}
                    </div>
                    {/* Current */}
                    {isCurrent && <div className={mx('absolute inset-0.5 rounded-full', DATE_CLASS_NAMES.current)} />}
                  </div>
                );
              })}
            </div>
          </div>
        );
      },
      [activeRange, handleDayPointerDown, handleDayPointerEnter, handleDayPointerUp, getMarker, selected, weekStartsOn],
    );

    return (
      <div
        {...composableProps(props, {
          role: 'none',
          classNames: ['flex flex-col h-full w-full justify-center overflow-hidden outline-hidden', classNames],
        })}
        ref={(node: HTMLDivElement | null) => {
          gridRef.current = node;
          if (typeof forwardedRef === 'function') {
            forwardedRef(node);
          } else if (forwardedRef) {
            (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }
        }}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Day of week labels */}
        <div style={{ width: defaultWidth }}>
          <Weekdays weekStartsOn={weekStartsOn} columnWidth={size} />
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
  Week: CalendarWeek,
};

export type {
  CalendarController,
  CalendarEvent,
  CalendarGridProps,
  CalendarRootProps,
  CalendarToolbarProps,
  CalendarWeekProps,
  Range,
};
