//
// Copyright 2026 DXOS.org
//

import * as d3 from 'd3';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import * as Popover from '@dxos/react-ui/Popover';
import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { type PlotData, type TimelineEvent, type TimelineOptions, type TimelineSpine } from '../../types.ts';
import {
  fitTimelineHeight,
  spreadLabels,
  timelineFraction,
  timelineRange,
  toTimelineEvents,
} from '../../util/index.ts';

// Vertical padding above the first and below the last time.
const PADDING = 16;

// Minimum distance between label baselines.
const LINE_HEIGHT = 20;

// Room for the time axis labels at the left edge.
const AXIS_WIDTH = 56;

// Margin between the spine and the side of the view it sits against.
const SPINE_MARGIN = 16;

// Furthest a label may be pushed from its event before the content grows taller.
const MAX_DRIFT = LINE_HEIGHT * 2;

// Horizontal run of a leader from the spine to its label.
const LEADER_WIDTH = 40;

// Minimum distance between axis ticks.
const TICK_SPACING = 48;

const DOT_RADIUS = 3.5;
const FONT_SIZE = 13;

// Approximate advance of a character at FONT_SIZE.
const CHAR_WIDTH = 7;

// Grace period for the pointer to move from an event onto its card.
const CLOSE_DELAY = 200;

const MIN_ZOOM = 1;
const MAX_ZOOM = 50;
const ZOOM_SPEED = 0.002;

type Side = 'start' | 'end';

type Lane = {
  side: Side;
  columns: string[];
  /** Where labels are anchored: their end on the start side, their start on the end side. */
  x: number;
  /** Room for label text. */
  width: number;
};

/** The spine's position and the lanes either side of it; on a centered spine, columns alternate sides. */
const layoutLanes = (spine: TimelineSpine, columns: string[], width: number): { spineX: number; lanes: Lane[] } => {
  const spineX =
    spine === 'left'
      ? AXIS_WIDTH + SPINE_MARGIN
      : spine === 'right'
        ? width - SPINE_MARGIN
        : AXIS_WIDTH + (width - AXIS_WIDTH) / 2;
  const sideOf = (index: number): Side =>
    spine === 'left' ? 'end' : spine === 'right' ? 'start' : index % 2 ? 'end' : 'start';
  const lanes = (['start', 'end'] as const).flatMap((side): Lane[] => {
    const laneColumns = columns.filter((_, index) => sideOf(index) === side);
    if (laneColumns.length === 0) {
      return [];
    }

    const x = side === 'start' ? spineX - LEADER_WIDTH : spineX + LEADER_WIDTH;
    return [{ side, columns: laneColumns, x, width: side === 'start' ? x - AXIS_WIDTH : width - x - PADDING }];
  });

  return { spineX, lanes };
};

const truncate = (text: string, width: number) => {
  const chars = Math.floor(width / CHAR_WIDTH);
  return text.length <= chars ? text : `${text.slice(0, Math.max(0, chars - 1))}…`;
};

export type TimelineProps = ThemedClassName<{
  /** The first column is the time (a year, date or date serial); each other column is a category of events. */
  data: PlotData;
  options?: TimelineOptions;
  /** Initial vertical zoom; ctrl/⌘ + wheel zooms about the pointer. */
  zoom?: number;
}>;

/** Events from tabular data plotted along a vertical, scrollable time axis. */
export const Timeline = ({ classNames, data, options = {}, zoom: initialZoom = MIN_ZOOM }: TimelineProps) => {
  const { spine = 'center', scale = 'linear', hidden, today = true } = options;
  const { ref: scrollRef, width = 0, height = 0 } = useResizeDetector<HTMLDivElement>({ refreshRate: 100 });
  const [zoom, setZoom] = useState(initialZoom);
  useEffect(() => setZoom(initialZoom), [initialZoom]);

  const { columns, events } = useMemo(() => toTimelineEvents(data), [data]);
  const range = useMemo(
    () => timelineRange(events, { start: options.start, end: options.end }),
    [events, options.start, options.end],
  );
  const visible = useMemo(() => columns.filter((column) => !hidden?.includes(column)), [columns, hidden]);
  const color = useMemo(() => d3.scaleOrdinal<string, string>(d3.schemeTableau10).domain(columns), [columns]);
  const { spineX, lanes } = useMemo(() => layoutLanes(spine, visible, width), [spine, visible, width]);

  const laneEvents = useMemo(
    () =>
      lanes.map((lane) =>
        events.filter(
          (event) => lane.columns.includes(event.column) && range && event.time >= range[0] && event.time <= range[1],
        ),
      ),
    [lanes, events, range],
  );

  // Crowded lanes grow the content past the viewport, so labels stay near their events.
  const contentHeight = useMemo(
    () =>
      range
        ? fitTimelineHeight(
            laneEvents.map((events) => events.map((event) => timelineFraction(event.time, range, scale))),
            {
              minHeight: Math.max(height * zoom, PADDING * 2),
              gap: LINE_HEIGHT,
              maxDrift: MAX_DRIFT,
              padding: PADDING,
            },
          )
        : height,
    [laneEvents, range, scale, height, zoom],
  );
  const top = PADDING;
  const bottom = contentHeight - PADDING;
  const yOf = useCallback(
    (time: number) => (range ? top + timelineFraction(time, range, scale) * (bottom - top) : top),
    [range, scale, top, bottom],
  );

  const ticks = useMemo(() => {
    if (!range) {
      return [];
    }

    const axis = d3.scaleUtc().domain(range);
    const count = Math.max(2, Math.floor((bottom - top) / LINE_HEIGHT));
    const format = axis.tickFormat(count);
    const result: { time: number; y: number; label: string }[] = [];
    for (const date of axis.ticks(count)) {
      const y = yOf(date.getTime());
      if (result.length === 0 || y - result[result.length - 1].y >= TICK_SPACING) {
        result.push({ time: date.getTime(), y, label: format(date) });
      }
    }
    return result;
  }, [range, yOf, top, bottom]);

  // Zoom about the pointer: the time under it stays put.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      event.preventDefault();
      const offset = event.clientY - scroller.getBoundingClientRect().top;
      setZoom((zoom) => {
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * Math.exp(-event.deltaY * ZOOM_SPEED)));
        const anchor = (scroller.scrollTop + offset) / zoom;
        requestAnimationFrame(() => {
          scroller.scrollTop = anchor * next - offset;
        });
        return next;
      });
    };

    scroller.addEventListener('wheel', handleWheel, { passive: false });
    return () => scroller.removeEventListener('wheel', handleWheel);
  }, [scrollRef]);

  // The hovered (or focused) event, shown in a card pointing at its dot on the spine.
  const [hovered, setHovered] = useState<{ event: TimelineEvent; side: Side; element: Element }>();
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleHover = useCallback((event: TimelineEvent, side: Side, element: Element) => {
    clearTimeout(closeTimer.current);
    setHovered({ event, side, element });
  }, []);
  const handleLeave = useCallback(() => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setHovered(undefined), CLOSE_DELAY);
  }, []);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const now = Date.now();
  const showToday = today && range && now >= range[0] && now <= range[1];

  return (
    <div role='img' className={mx('dx-fill grid grid-rows-[min-content_1fr] overflow-hidden', classNames)}>
      <div className='relative h-8 text-sm font-medium uppercase tracking-wider'>
        {lanes.map((lane) => (
          <div
            key={lane.side}
            className={mx('absolute inset-y-0 flex items-center gap-4', lane.side === 'start' && 'flex-row-reverse')}
            style={lane.side === 'start' ? { right: width - lane.x } : { left: lane.x }}
          >
            {lane.columns.map((column) => (
              <span key={column} style={{ color: color(column) }}>
                {column}
              </span>
            ))}
          </div>
        ))}
      </div>

      <div ref={scrollRef} className='overflow-y-auto overflow-x-hidden'>
        {width > 0 && range && (
          <svg width={width} height={contentHeight} fontSize={FONT_SIZE} className='block'>
            {/* Alternate bands between ticks. */}
            {ticks.map((tick, index) =>
              index % 2 === 0 ? (
                <rect
                  key={`band-${tick.time}`}
                  x={0}
                  y={tick.y}
                  width={width}
                  height={(ticks[index + 1]?.y ?? bottom) - tick.y}
                  fill='currentColor'
                  fillOpacity={0.04}
                />
              ) : null,
            )}

            {ticks.map((tick) => (
              <g key={tick.time}>
                <text
                  x={PADDING / 2}
                  y={tick.y}
                  dominantBaseline='middle'
                  fill='currentColor'
                  fillOpacity={0.5}
                  fontWeight={600}
                >
                  {tick.label}
                </text>
                <line x1={spineX - 6} x2={spineX + 6} y1={tick.y} y2={tick.y} stroke='currentColor' />
              </g>
            ))}

            <line x1={spineX} x2={spineX} y1={top} y2={bottom} stroke='currentColor' strokeWidth={1.5} />

            {showToday && (
              <g>
                <line
                  x1={0}
                  x2={width}
                  y1={yOf(now)}
                  y2={yOf(now)}
                  stroke='currentColor'
                  strokeOpacity={0.6}
                  strokeDasharray='6,4'
                />
                <text x={width - PADDING / 2} y={yOf(now) - 6} textAnchor='end' fill='currentColor' fontWeight={600}>
                  Today
                </text>
              </g>
            )}

            {lanes.map((lane, index) => (
              <LaneEvents
                key={lane.side}
                lane={lane}
                events={laneEvents[index]}
                spineX={spineX}
                yOf={yOf}
                top={top}
                bottom={bottom}
                color={color}
                hovered={hovered?.event}
                onHover={handleHover}
                onLeave={handleLeave}
              />
            ))}
          </svg>
        )}
      </div>

      {hovered && (
        <EventCard
          // Remount per event so the card is placed against the newly hovered label.
          key={`${hovered.event.column}-${hovered.event.time}-${hovered.event.label}`}
          {...hovered}
          color={color(hovered.event.column)}
          onClose={() => setHovered(undefined)}
          onHover={() => clearTimeout(closeTimer.current)}
          onLeave={handleLeave}
        />
      )}
    </div>
  );
};

Timeline.displayName = 'Timeline';

type LaneEventsProps = {
  lane: Lane;
  events: TimelineEvent[];
  spineX: number;
  yOf: (time: number) => number;
  top: number;
  bottom: number;
  color: (column: string) => string;
  hovered?: TimelineEvent;
  onHover: (event: TimelineEvent, side: Side, element: Element) => void;
  onLeave: () => void;
};

/** A lane's dots on the spine, joined by leaders to labels spread apart so none overlap. */
const LaneEvents = ({ lane, events, spineX, yOf, top, bottom, color, hovered, onHover, onLeave }: LaneEventsProps) => {
  const ys = events.map((event) => yOf(event.time));
  const labelYs = spreadLabels(ys, LINE_HEIGHT, top, bottom);
  const direction = lane.side === 'start' ? -1 : 1;

  // The card points at the event's dot on the spine.
  const handleDotHover = (event: TimelineEvent, group: SVGGElement) => {
    const dot = group.querySelector('circle');
    if (dot) {
      onHover(event, lane.side, dot);
    }
  };

  return (
    <g>
      {events.map((event, index) => {
        const y = ys[index];
        const labelY = labelYs[index];
        const fill = color(event.column);
        const leader = [
          `M ${spineX + direction * (DOT_RADIUS + 1)} ${y}`,
          `H ${spineX + direction * 10}`,
          `L ${lane.x - direction * 12} ${labelY}`,
          `H ${lane.x - direction * 4}`,
        ].join(' ');
        const label = truncate(event.label, lane.width - (event.date.length + 1) * CHAR_WIDTH);
        const date = (
          <tspan fill={fill} fontWeight={700}>
            {event.date}
          </tspan>
        );

        return (
          <g
            key={`${event.column}-${event.time}-${index}`}
            tabIndex={0}
            role='button'
            aria-label={`${event.date} ${event.label}`}
            className='outline-none'
            onPointerEnter={(pointerEvent) => handleDotHover(event, pointerEvent.currentTarget)}
            onPointerLeave={onLeave}
            onFocus={(focusEvent) => handleDotHover(event, focusEvent.currentTarget)}
            onBlur={onLeave}
          >
            <path d={leader} fill='none' stroke={fill} strokeWidth={event === hovered ? 2 : 1.25} />
            <circle cx={spineX} cy={y} r={event === hovered ? DOT_RADIUS + 1.5 : DOT_RADIUS} fill={fill} />
            <text
              x={lane.x}
              y={labelY}
              dominantBaseline='middle'
              textAnchor={lane.side === 'start' ? 'end' : 'start'}
              fill='currentColor'
              fontWeight={event === hovered ? 600 : undefined}
              className='cursor-default'
            >
              {lane.side === 'start' ? (
                <>
                  {label} {date}
                </>
              ) : (
                <>
                  {date} {label}
                </>
              )}
            </text>
          </g>
        );
      })}
    </g>
  );
};

type EventCardProps = {
  event: TimelineEvent;
  side: Side;
  element: Element;
  color: string;
  onClose: () => void;
  onHover: () => void;
  onLeave: () => void;
};

/** The hovered event's title, date, category and description, pointing at its dot from across the spine. */
const EventCard = ({ event, side, element, color, onClose, onHover, onLeave }: EventCardProps) => (
  <Popover.Root
    open
    autoFocus={false}
    onOpenChange={({ open }) => !open && onClose()}
    positioning={{
      // Across the spine from the label, so the hovered label stays visible.
      placement: side === 'start' ? 'right' : 'left',
      getAnchorRect: () => element.getBoundingClientRect(),
    }}
  >
    <Popover.Content classNames='max-w-80' onPointerEnter={onHover} onPointerLeave={onLeave}>
      <Popover.Title>{event.label}</Popover.Title>
      <div className='text-sm font-medium' style={{ color }}>
        {event.date} · {event.column}
      </div>
      {event.description && <Popover.Description>{event.description}</Popover.Description>}
    </Popover.Content>
  </Popover.Root>
);
