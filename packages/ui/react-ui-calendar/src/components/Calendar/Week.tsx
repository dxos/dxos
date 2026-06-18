//
// Copyright 2025 DXOS.org
//

import { addDays, startOfDay, startOfWeek } from 'date-fns';
import React, {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { composable, composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useCalendarContext } from './context';
import {
  MINUTES_PER_DAY,
  SNAP_MINUTES,
  getRowIndex,
  gridEpoch,
  isSameDay,
  layoutDayEvents,
  minutesOfDay,
  minutesToY,
  setMinutesOfDay,
  snapMinutes,
  yToMinutes,
} from './util';
import { Weekdays } from './Weekdays';

const CALENDAR_WEEK_NAME = 'CalendarWeek';

const HOUR_HEIGHT = 48; // px per hour.
const GUTTER_WIDTH = 56; // px, hour-label column.
const RESIZE_HANDLE = 6; // px, top/bottom hit zone for resizing.
const MIN_DURATION = SNAP_MINUTES; // Minimum event duration (minutes).
const INITIAL_HOUR = 8; // Hour scrolled into view on mount.

/** An event rendered on the week's time grid. Times are interpreted in local time. */
export type CalendarEvent = {
  id: string;
  title?: string;
  start: Date;
  end: Date;
};

type CalendarWeekProps = {
  /** Any date within the week to display; the week is derived via `weekStartsOn`. Defaults to today. */
  date?: Date;
  events?: CalendarEvent[];
  /** Fired when the user drags out a new time slot on an empty part of a day column. */
  onEventCreate?: (event: { start: Date; end: Date }) => void;
  /** Fired when an event is moved (duration preserved) or resized (one edge changed). */
  onEventUpdate?: (event: { id: string; start: Date; end: Date }) => void;
};

type GestureKind = 'create' | 'move' | 'resize-start' | 'resize-end';

// A live drag gesture. `anchorMinutes` is the fixed edge for create/resize; `grabOffset` is the
// pointer's offset (minutes) into the event when moving, so the event doesn't jump under the cursor.
type Gesture = {
  kind: GestureKind;
  day: Date;
  eventId?: string;
  anchorMinutes: number;
  grabOffset: number;
  durationMinutes: number;
};

// A pending edit (the gesture's live result) overlaid on the source events while dragging.
type Draft = { start: Date; end: Date; eventId?: string };

const CalendarWeek = composable<HTMLDivElement, CalendarWeekProps>(
  ({ classNames, date, events = [], onEventCreate, onEventUpdate, ...props }, forwardedRef) => {
    const { weekStartsOn, event: scrollEvent, setIndex } = useCalendarContext(CALENDAR_WEEK_NAME);
    const today = useMemo(() => new Date(), []);

    // Anchor of the displayed week. Seeded from the `date` prop and re-synced when it changes, but also
    // driven by the shared scroll/select signal (e.g. the Toolbar's Today button, controller.scrollTo).
    const [viewDate, setViewDate] = useState<Date>(() => date ?? today);
    useEffect(() => {
      if (date) {
        setViewDate(date);
      }
    }, [date]);
    useEffect(() => {
      return scrollEvent.on(({ date }) => setViewDate(date));
    }, [scrollEvent]);

    const weekDays = useMemo(() => {
      const weekStart = startOfWeek(viewDate, { weekStartsOn });
      return Array.from({ length: 7 }, (_, index) => startOfDay(addDays(weekStart, index)));
    }, [viewDate, weekStartsOn]);

    // Report the displayed week to the shared context so the Toolbar's month/year label tracks it.
    useEffect(() => {
      setIndex(getRowIndex(gridEpoch, weekDays[0], weekStartsOn));
    }, [weekDays, weekStartsOn, setIndex]);

    // Index events by day so each column lays out independently.
    const eventsByDay = useMemo(() => {
      const byDay = weekDays.map(() => [] as CalendarEvent[]);
      for (const event of events) {
        const dayIndex = weekDays.findIndex((day) => isSameDay(day, event.start));
        if (dayIndex >= 0) {
          byDay[dayIndex].push(event);
        }
      }
      return byDay;
    }, [events, weekDays]);

    const scrollRef = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
      scrollRef.current?.scrollTo({ top: minutesToY(INITIAL_HOUR * 60, HOUR_HEIGHT) });
    }, []);

    //
    // Drag gesture: create / move / resize. All vertical-only, snapped to `SNAP_MINUTES`.
    //
    const gestureRef = useRef<Gesture | undefined>(undefined);
    const columnsRef = useRef<(HTMLDivElement | null)[]>([]);
    const [draft, setDraft] = useState<Draft | undefined>(undefined);

    // All day columns share the same vertical geometry, so any column resolves clientY → minutes.
    const pointerMinutes = useCallback((clientY: number): number => {
      const rect = columnsRef.current.find(Boolean)?.getBoundingClientRect();
      if (!rect) {
        return 0;
      }
      return Math.max(0, Math.min(MINUTES_PER_DAY, yToMinutes(clientY - rect.top, HOUR_HEIGHT)));
    }, []);

    // The day column under clientX (used to move events across days); undefined when outside all columns.
    const dayFromX = useCallback(
      (clientX: number): Date | undefined => {
        const index = columnsRef.current.findIndex((node) => {
          const rect = node?.getBoundingClientRect();
          return rect && clientX >= rect.left && clientX < rect.right;
        });
        return index >= 0 ? weekDays[index] : undefined;
      },
      [weekDays],
    );

    const applyGesture = useCallback(
      (clientX: number, clientY: number): Draft | undefined => {
        const gesture = gestureRef.current;
        if (!gesture) {
          return undefined;
        }
        const { kind, day, eventId, anchorMinutes, grabOffset, durationMinutes } = gesture;
        const raw = pointerMinutes(clientY);
        switch (kind) {
          case 'create': {
            const focus = snapMinutes(raw);
            const from = Math.min(anchorMinutes, focus);
            const to = Math.max(anchorMinutes, focus);
            const end = Math.max(to, from + MIN_DURATION);
            return { eventId, start: setMinutesOfDay(day, from), end: setMinutesOfDay(day, end) };
          }
          case 'move': {
            // Moving may cross day columns; the time-of-day and duration are preserved.
            const targetDay = dayFromX(clientX) ?? day;
            let start = snapMinutes(raw - grabOffset);
            start = Math.max(0, Math.min(MINUTES_PER_DAY - durationMinutes, start));
            return {
              eventId,
              start: setMinutesOfDay(targetDay, start),
              end: setMinutesOfDay(targetDay, start + durationMinutes),
            };
          }
          case 'resize-start': {
            const start = Math.min(snapMinutes(raw), anchorMinutes - MIN_DURATION);
            return { eventId, start: setMinutesOfDay(day, start), end: setMinutesOfDay(day, anchorMinutes) };
          }
          case 'resize-end': {
            const end = Math.max(snapMinutes(raw), anchorMinutes + MIN_DURATION);
            return { eventId, start: setMinutesOfDay(day, anchorMinutes), end: setMinutesOfDay(day, end) };
          }
        }
      },
      [dayFromX, pointerMinutes],
    );

    // Latest commit callbacks, read at pointerup so the listeners attached on pointerdown never go stale.
    const callbacksRef = useRef({ onEventCreate, onEventUpdate });
    callbacksRef.current = { onEventCreate, onEventUpdate };

    // Removes the active gesture's window listeners; replaced on each `beginGesture` and called on unmount.
    const detachRef = useRef<() => void>(() => {});

    const beginGesture = useCallback(
      (gesture: Gesture, ev: ReactPointerEvent) => {
        ev.preventDefault();
        ev.stopPropagation();
        gestureRef.current = gesture;
        setDraft(applyGesture(ev.clientX, ev.clientY));

        // Attach listeners imperatively (not via effect) so no pointer event is missed in the window
        // between pointerdown and the next render.
        const handleMove = (moveEv: PointerEvent) => {
          if (gestureRef.current) {
            setDraft(applyGesture(moveEv.clientX, moveEv.clientY));
          }
        };

        const handleUp = (upEv: PointerEvent) => {
          const active = gestureRef.current;
          const result = applyGesture(upEv.clientX, upEv.clientY);
          detachRef.current();
          gestureRef.current = undefined;
          setDraft(undefined);
          if (active && result) {
            if (active.kind === 'create') {
              callbacksRef.current.onEventCreate?.({ start: result.start, end: result.end });
            } else if (result.eventId) {
              callbacksRef.current.onEventUpdate?.({ id: result.eventId, start: result.start, end: result.end });
            }
          }
        };

        detachRef.current = () => {
          window.removeEventListener('pointermove', handleMove);
          window.removeEventListener('pointerup', handleUp);
          window.removeEventListener('pointercancel', handleUp);
        };
        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);
        window.addEventListener('pointercancel', handleUp);
      },
      [applyGesture],
    );

    useEffect(() => () => detachRef.current(), []);

    const handleColumnPointerDown = useCallback(
      (day: Date, event: ReactPointerEvent<HTMLDivElement>) => {
        // Only the column background starts a create gesture; events stop propagation.
        const rect = event.currentTarget.getBoundingClientRect();
        const anchor = snapMinutes(yToMinutes(event.clientY - rect.top, HOUR_HEIGHT));
        beginGesture({ kind: 'create', day, anchorMinutes: anchor, grabOffset: 0, durationMinutes: 0 }, event);
      },
      [beginGesture],
    );

    // Render an event block bound to the gesture handlers for a given day column. `day` is the column
    // the block currently sits in (its original day, or the target day while being dragged across).
    const renderEvent = useCallback(
      (event: CalendarEvent, day: Date, start: Date, end: Date, columnIndex: number, columnCount: number) => (
        <EventBlock
          key={event.id}
          event={event}
          start={start}
          end={end}
          columnIndex={columnIndex}
          columnCount={columnCount}
          onMoveStart={(ev) =>
            beginGesture(
              {
                kind: 'move',
                day,
                eventId: event.id,
                anchorMinutes: 0,
                grabOffset: pointerMinutes(ev.clientY) - minutesOfDay(event.start),
                durationMinutes: minutesOfDay(event.end) - minutesOfDay(event.start),
              },
              ev,
            )
          }
          onResizeStart={(ev) =>
            beginGesture(
              {
                kind: 'resize-start',
                day,
                eventId: event.id,
                anchorMinutes: minutesOfDay(event.end),
                grabOffset: 0,
                durationMinutes: 0,
              },
              ev,
            )
          }
          onResizeEnd={(ev) =>
            beginGesture(
              {
                kind: 'resize-end',
                day,
                eventId: event.id,
                anchorMinutes: minutesOfDay(event.start),
                grabOffset: 0,
                durationMinutes: 0,
              },
              ev,
            )
          }
        />
      ),
      [beginGesture, pointerMinutes],
    );

    // The event under an active move, resolved once so the origin column can drop it and the target
    // column can render it while the pointer is over a different day.
    const draggedEvent = draft?.eventId ? events.find((event) => event.id === draft.eventId) : undefined;

    return (
      <div
        {...composableProps(props, {
          classNames: ['flex flex-col h-full w-full overflow-hidden outline-hidden', classNames],
        })}
        ref={forwardedRef}
      >
        <Weekdays weekStartsOn={weekStartsOn} gutter={GUTTER_WIDTH} dates={weekDays} />

        <div ref={scrollRef} className='flex-1 overflow-y-auto _scrollbar-thin'>
          <div
            className='grid relative'
            style={{
              height: minutesToY(MINUTES_PER_DAY, HOUR_HEIGHT),
              gridTemplateColumns: `${GUTTER_WIDTH}px repeat(7, 1fr)`,
            }}
          >
            {/* Hour gutter + faint hour lines spanning all columns. */}
            <div className='relative'>
              {Array.from({ length: 24 }, (_, hour) => (
                <div
                  key={hour}
                  className='absolute right-1 -translate-y-1/2 text-xs text-description tabular-nums'
                  style={{ top: minutesToY(hour * 60, HOUR_HEIGHT) }}
                >
                  {hour === 0 ? '' : `${hour.toString().padStart(2, '0')}:00`}
                </div>
              ))}
            </div>

            {weekDays.map((day, dayIndex) => {
              const dayEvents = eventsByDay[dayIndex];
              const layout = layoutDayEvents(dayEvents);
              const isToday = isSameDay(day, today);
              // The draft when it currently belongs to this column (origin for resize, target for a cross-day move).
              const draftHere = draft && isSameDay(day, draft.start) ? draft : undefined;
              return (
                <div
                  key={day.toISOString()}
                  ref={(node) => {
                    columnsRef.current[dayIndex] = node;
                  }}
                  data-date={day.toISOString()}
                  className={mx(
                    'relative border-l border-separator cursor-cell select-none',
                    dayIndex === 6 && 'border-r',
                    isToday && 'bg-primary-500/5',
                  )}
                  onPointerDown={(ev) => handleColumnPointerDown(day, ev)}
                >
                  {/* Faint hour lines. */}
                  {Array.from({ length: 24 }, (_, hour) => (
                    <div
                      key={hour}
                      className='absolute inset-x-0 border-t border-separator/60'
                      style={{ top: minutesToY(hour * 60, HOUR_HEIGHT) }}
                    />
                  ))}

                  {/* Events. */}
                  {dayEvents.map((event, index) => {
                    const slot = layout.get(index) ?? { columnIndex: 0, columnCount: 1 };
                    const editing = draft && draft.eventId === event.id ? draft : undefined;
                    // Dropped from this column while the move drags it onto another day.
                    if (editing && !isSameDay(editing.start, day)) {
                      return null;
                    }
                    const start = editing ? editing.start : event.start;
                    const end = editing ? editing.end : event.end;
                    return renderEvent(event, day, start, end, slot.columnIndex, slot.columnCount);
                  })}

                  {/* Event being dragged in from another day — rendered full-width above this column's events. */}
                  {draftHere &&
                    draggedEvent &&
                    !dayEvents.some((event) => event.id === draggedEvent.id) &&
                    renderEvent(draggedEvent, day, draft!.start, draft!.end, 0, 1)}

                  {/* Pending create rectangle. */}
                  {draftHere && draft && !draft.eventId && <PendingBlock start={draft.start} end={draft.end} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  },
);

CalendarWeek.displayName = CALENDAR_WEEK_NAME;

//
// EventBlock
//

const formatTime = (date: Date): string => {
  const minutes = minutesOfDay(date);
  const hour = Math.floor(minutes / 60);
  const minute = Math.round(minutes % 60);
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};

type EventBlockProps = {
  event: CalendarEvent;
  start: Date;
  end: Date;
  columnIndex: number;
  columnCount: number;
  onMoveStart: (ev: ReactPointerEvent<HTMLDivElement>) => void;
  onResizeStart: (ev: ReactPointerEvent<HTMLDivElement>) => void;
  onResizeEnd: (ev: ReactPointerEvent<HTMLDivElement>) => void;
};

const EventBlock = ({
  event,
  start,
  end,
  columnIndex,
  columnCount,
  onMoveStart,
  onResizeStart,
  onResizeEnd,
}: EventBlockProps) => {
  const top = minutesToY(minutesOfDay(start), HOUR_HEIGHT);
  const height = Math.max(minutesToY(minutesOfDay(end) - minutesOfDay(start), HOUR_HEIGHT), RESIZE_HANDLE * 2);
  // Leave a 1px gutter between side-by-side columns.
  const widthPct = 100 / columnCount;
  return (
    <div
      className='absolute rounded-sm bg-primary-500/80 text-inverse-fg overflow-hidden cursor-move shadow-sm'
      style={{
        top,
        height,
        left: `calc(${columnIndex * widthPct}% + 1px)`,
        width: `calc(${widthPct}% - 2px)`,
      }}
      onPointerDown={onMoveStart}
    >
      <div
        className='absolute inset-x-0 top-0 cursor-ns-resize'
        style={{ height: RESIZE_HANDLE }}
        onPointerDown={onResizeStart}
      />
      <div className='px-1 py-0.5 text-xs leading-tight'>
        <div className='font-medium truncate'>{event.title ?? '(untitled)'}</div>
        {/* <div className='tabular-nums opacity-80'>
          {formatTime(start)}–{formatTime(end)}
        </div> */}
      </div>
      <div
        className='absolute inset-x-0 bottom-0 cursor-ns-resize'
        style={{ height: RESIZE_HANDLE }}
        onPointerDown={onResizeEnd}
      />
    </div>
  );
};

//
// PendingBlock
//

const PendingBlock = ({ start, end }: { start: Date; end: Date }) => {
  const top = minutesToY(minutesOfDay(start), HOUR_HEIGHT);
  const height = minutesToY(minutesOfDay(end) - minutesOfDay(start), HOUR_HEIGHT);
  return (
    <div
      className='absolute inset-x-0 rounded bg-primary-500/40 border border-primary-500 pointer-events-none'
      style={{ top, height }}
    >
      <div className='px-1 py-0.5 text-xs tabular-nums text-inverse-fg'>
        {formatTime(start)}–{formatTime(end)}
      </div>
    </div>
  );
};

export { CalendarWeek };
export type { CalendarWeekProps };
