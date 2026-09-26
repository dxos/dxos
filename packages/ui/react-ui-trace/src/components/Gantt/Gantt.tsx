//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import React, { type KeyboardEvent, type ReactNode, forwardRef, useEffect, useMemo, useRef, useState } from 'react';

import { createContext } from '@dxos/react-hooks';
import { HoverCard, ScrollArea, type ThemedClassName, composable, composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type Band, type Row, orderRows } from './gantt-rows.ts';
import { type GanttAxis, type GanttScale, eventScale, timeScale } from './gantt-scale.ts';
import { useEnter } from './useEnter.ts';

/**
 * The chart's vocabulary is groups, lanes, segments and markers — deliberately not the vocabulary of
 * whatever is being charted. A host maps its own nouns onto these (a process onto a group, a task
 * onto a lane, a status change onto a marker) and the chart stays ignorant of what they mean.
 */
export type GanttLaneStatus = 'pending' | 'blocked' | 'running' | 'review' | 'done' | 'failed';

/**
 * A band of related lanes, enclosed by one rectangle. Pure structure: the lanes inside carry the
 * labels, so a group needs no name of its own.
 */
export type GanttGroup = {
  id: string;
  /** Indents under another group; a nested group's band is drawn after its parent's. */
  parentId?: string;
};

/** One stretch during which a lane was worked. `end` is absent while the stretch is still open. */
export type GanttSegment = {
  start: number;
  end?: number;
};

/** A fact the host wants beside a lane. `Gantt.Meta` renders it and never interprets it. */
export type GanttMeta = {
  label: string;
  title?: string;
};

/**
 * One row. Its three references are deliberately distinct: `groupId` is which band it sits in,
 * `parentId` is what it nests under, and `openedFrom` is what caused it. Collapsing any two of them
 * into one edge is what left the previous model unable to hold a task hierarchy and a process tree
 * at the same time.
 */
export type GanttLane = {
  id: string;
  label: string;
  status: GanttLaneStatus;
  /** The band this lane sits in. */
  groupId?: string;
  /** Indents under another lane of the same group — nesting, nothing more. */
  parentId?: string;
  /** Every stretch this lane was worked. A lane with none exists but has no extent, so no bar. */
  segments?: readonly GanttSegment[];
  /** The node this lane opened out of, on another lane. */
  openedFrom?: { laneId: string; markerId: string };
  /**
   * The node this lane's result came back into, on another lane — the mirror of `openedFrom`, and a
   * separate fact: a lane can open out of another and end without ever reporting back.
   */
  closedInto?: { laneId: string; markerId: string };
  /** Lanes this one waits on. */
  blockedOn?: readonly string[];
  meta?: readonly GanttMeta[];
};

export type GanttMarker = {
  id: string;
  laneId: string;
  /** The host's own word for what happened; shown in the hover card, never interpreted. */
  kind?: string;
  timestamp: number;
  label: string;
  level?: 'info' | 'warn' | 'error';
};

const PAD_X = 16;
const ROW_HEIGHT = 24;
const HEADER_HEIGHT = 20;

/** Pixels per event on the `event` axis — wide enough that two adjacent nodes read as two. */
const EVENT_STEP = 32;
/** How long a newly arrived element takes to travel from where it came from to where it belongs. */
const ENTER_TRANSITION = 'duration-500 ease-out';

/** Within this of the live edge the chart keeps following it; past it the reader is reading history. */
const FOLLOW_SLACK = 4;

const NODE_RADIUS = 6;
const BAR_HEIGHT = 15;
/** The thread through a lane's nodes: a hairline, so the nodes remain what the row reads as. */
const THREAD_HEIGHT = 1;
/**
 * A bar reaches half its height past its first and last instant, so a node sitting on either one is
 * as far from the bar's end as it is from its top and bottom.
 */
const BAR_OVERHANG = BAR_HEIGHT / 2;

/** Gap between adjacent band rectangles, halved on each. */
const GROUP_INSET = 2;
/** The rectangle's clearance around its bars, the same on every side, so its corners stay concentric with theirs. */
const GROUP_PAD = ROW_HEIGHT / 2 - BAR_HEIGHT / 2 - GROUP_INSET;
const GROUP_RADIUS = BAR_HEIGHT / 2 + GROUP_PAD;

/** Radius of the connector's bend from the drop into the lane it opens. */
const BEND_RADIUS = BAR_HEIGHT / 2;

/**
 * Bar, node, thread and label colours per status: nodes and the thread through them are the bar's
 * hue in a lighter shade, and `edge` — the live end of a lane still running — is the stronger shade
 * the legend's own status dot uses, so the two read as the same statement about the lane.
 */
const STATUS_COLOR: Record<
  GanttLaneStatus,
  { fill: string; node: string; edge: string; thread: string; text: string }
> = {
  pending: {
    fill: 'fill-neutral-500/40',
    node: 'fill-neutral-300',
    edge: 'fill-neutral-400',
    thread: 'stroke-neutral-300',
    text: 'text-neutral-400',
  },
  blocked: {
    fill: 'fill-orange-500/40',
    node: 'fill-orange-300',
    edge: 'fill-orange-500',
    thread: 'stroke-orange-300',
    text: 'text-orange-500',
  },
  running: {
    fill: 'fill-sky-500/40',
    node: 'fill-sky-300',
    edge: 'fill-sky-500',
    thread: 'stroke-sky-300',
    text: 'text-sky-500',
  },
  review: {
    fill: 'fill-cyan-500/40',
    node: 'fill-cyan-300',
    edge: 'fill-cyan-500',
    thread: 'stroke-cyan-300',
    text: 'text-cyan-500',
  },
  done: {
    fill: 'fill-green-500/40',
    node: 'fill-green-300',
    edge: 'fill-green-500',
    thread: 'stroke-green-300',
    text: 'text-green-500',
  },
  failed: {
    fill: 'fill-red-500/40',
    node: 'fill-red-300',
    edge: 'fill-red-500',
    thread: 'stroke-red-300',
    text: 'text-red-500',
  },
};

const CONNECTOR_CLASSNAME = 'stroke-fuchsia-500';

export type GanttData = {
  /** The bands. A chart with none draws its lanes plain, with no rectangles. */
  groups?: readonly GanttGroup[];
  lanes: readonly GanttLane[];
  markers?: readonly GanttMarker[];
  range?: { start: number; end: number };
  now?: number;
  showNow?: boolean;
  /** What the horizontal axis measures; real time by default. */
  axis?: GanttAxis;
  /** Pixels per event on the `event` axis. */
  eventStep?: number;
  /**
   * Slide a newly arrived event out of the one before it — out of the node that opened its lane, for
   * a lane's first — and grow its bar to meet it. Only events that arrive while the chart is on screen
   * animate, so a chart that is merely mounted is still.
   */
  animate?: boolean;
  onLaneSelect?: (lane: GanttLane) => void;
  onMarkerSelect?: (marker: GanttMarker) => void;
};

/** What every part reads: the ordered rows and the shared axis, resolved once by the root. */
type GanttContextValue = {
  rows: Row[];
  bands: Band[];
  rowById: Map<string, Row>;
  markers: readonly GanttMarker[];
  markerById: Map<string, GanttMarker>;
  range: { start: number; end: number };
} & Pick<GanttData, 'onLaneSelect' | 'onMarkerSelect' | 'now' | 'showNow' | 'axis' | 'eventStep' | 'animate'>;

const [GanttProvider, useGanttContext] = createContext<GanttContextValue>('Gantt');

//
// Root
//

type GanttRootProps = ThemedClassName<GanttData & { children?: ReactNode }>;

/**
 * Gantt view of lanes on a shared axis. The root resolves the rows and the axis; the parts lay out
 * side by side in the order given, sharing one row grid: `Legend` names the lanes, `Chart` draws
 * them, `Meta` shows whatever the host attached. A host that already lists the lanes renders the
 * chart alone.
 */
const GanttRoot = composable<HTMLDivElement, GanttRootProps>(
  (
    {
      groups = [],
      lanes,
      markers = [],
      range: rangeProp,
      now,
      showNow,
      axis,
      eventStep,
      animate,
      onLaneSelect,
      onMarkerSelect,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const { rows, bands } = useMemo(() => orderRows(groups, lanes), [groups, lanes]);
    const rowById = useMemo(() => new Map(rows.map((row) => [row.lane.id, row])), [rows]);
    const markerById = useMemo(() => new Map(markers.map((marker) => [marker.id, marker])), [markers]);
    const range = useMemo(() => {
      if (rangeProp) {
        return rangeProp;
      }
      const times = [
        ...lanes.flatMap((lane) => (lane.segments ?? []).flatMap((segment) => [segment.start, segment.end])),
        ...markers.map((marker) => marker.timestamp),
      ]
        .filter((time): time is number => time !== undefined)
        .concat(now === undefined ? [] : [now]);
      const start = times.length > 0 ? Math.min(...times) : 0;
      return { start, end: times.length > 0 ? Math.max(...times) : start };
    }, [rangeProp, lanes, markers, now]);

    return (
      <GanttProvider
        rows={rows}
        bands={bands}
        rowById={rowById}
        markers={markers}
        markerById={markerById}
        range={range}
        now={now}
        showNow={showNow}
        axis={axis}
        eventStep={eventStep}
        animate={animate}
        onLaneSelect={onLaneSelect}
        onMarkerSelect={onMarkerSelect}
      >
        <div
          {...composableProps(props, {
            // `items-start`: the parts are drawn in pixel rows, so a stretching host must not spread them.
            classNames: 'flex w-full items-start text-xs font-mono overflow-hidden',
          })}
          ref={forwardedRef}
        >
          {children}
        </div>
      </GanttProvider>
    );
  },
);

GanttRoot.displayName = 'Gantt.Root';

//
// Legend
//

type GanttLegendProps = ThemedClassName<{}>;

/** The lane names, one per row, indented by depth; each row is the lane's keyboard path. */
const GanttLegend = composable<HTMLDivElement, GanttLegendProps>((props, forwardedRef) => {
  const { rows, onLaneSelect } = useGanttContext('Gantt.Legend');
  return (
    <div
      {...composableProps(props, { classNames: 'shrink-0 w-[min(20rem,40%)] min-w-40 flex flex-col' })}
      ref={forwardedRef}
    >
      <div style={{ height: HEADER_HEIGHT }} />
      {rows.map(({ lane, depth }) => (
        <div
          key={lane.id}
          className={mx(
            'flex items-center gap-2 truncate',
            onLaneSelect && 'cursor-pointer hover:bg-hover-surface-subtle',
          )}
          style={{ height: ROW_HEIGHT, paddingInlineStart: `${0.5 + depth}rem` }}
          // Button semantics only when there is something to select: the label row is the lane's
          // keyboard path, and an inert focus stop would be noise.
          {...(onLaneSelect && {
            role: 'button',
            tabIndex: 0,
            onClick: () => onLaneSelect(lane),
            onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onLaneSelect(lane);
              }
            },
          })}
        >
          <span className={mx('shrink-0 w-2 h-2 rounded-full bg-current', STATUS_COLOR[lane.status].text)} />
          <span className='truncate text-base-fg'>{lane.label}</span>
        </div>
      ))}
    </div>
  );
});

GanttLegend.displayName = 'Gantt.Legend';

//
// Meta
//

type GanttMetaProps = ThemedClassName<{}>;

/** Whatever the host attached to each lane, aligned to the rows. */
const GanttMeta = composable<HTMLDivElement, GanttMetaProps>((props, forwardedRef) => {
  const { rows } = useGanttContext('Gantt.Meta');
  return (
    <div {...composableProps(props, { classNames: 'shrink-0 flex flex-col' })} ref={forwardedRef}>
      <div style={{ height: HEADER_HEIGHT }} />
      {rows.map(({ lane }) => (
        <div
          key={lane.id}
          className='flex items-center justify-end gap-2 px-2 text-description whitespace-nowrap'
          style={{ height: ROW_HEIGHT }}
        >
          {(lane.meta ?? []).map(({ label, title }, index) => (
            <span key={index} title={title}>
              {label}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
});

GanttMeta.displayName = 'Gantt.Meta';

//
// Chart
//

type GanttChartProps = ThemedClassName<{}>;

/** One drawn stretch of a lane: where its bar runs, and the nodes threaded through it. */
type Stretch = {
  /** The instants the segment spans, in pixels. */
  from: number;
  to: number;
  /** The drawn positions of the first and last node inside it; absent when it holds fewer than two. */
  threadFrom?: number;
  threadTo?: number;
};

/**
 * The drawing: a lane is a rounded bar per segment with its markers threaded through as nodes, a
 * group's rectangle encloses its band, and connectors draw dependencies and the node a lane opened
 * out of.
 *
 * The part owns its horizontal scroll: on the `event` axis the drawing is as wide as the events need
 * and follows the newest of them, while the legend beside it stays where it is.
 */
const GanttChart = forwardRef<HTMLDivElement, GanttChartProps>(({ classNames }, forwardedRef) => {
  const {
    rows,
    bands,
    rowById,
    markers,
    markerById,
    range,
    now,
    showNow,
    axis = 'time',
    eventStep = EVENT_STEP,
    animate,
    onLaneSelect,
    onMarkerSelect,
  } = useGanttContext('Gantt.Chart');
  // The viewport, not the drawing, is what the time axis is fitted to: the drawing may be wider.
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const followRef = useRef(true);
  const glideRef = useRef(false);
  const drawnRef = useRef<number | undefined>(undefined);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width));
    observer.observe(element);
    // Listened for rather than taken as a prop: `ScrollArea.Viewport` accepts only what it slots.
    const onScroll = (): void => {
      const atEdge = element.scrollWidth - element.clientWidth - element.scrollLeft <= FOLLOW_SLACK;
      // A glide of our own emits scroll events all the way there, every one of them short of the
      // edge. Reading those as the reader scrolling away would unpin the chart on the very frame it
      // set out to follow; only its arrival is worth acting on.
      if (glideRef.current) {
        glideRef.current = !atEdge;
        return;
      }
      followRef.current = atEdge;
    };
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', onScroll);
    };
  }, []);

  /** Each lane's markers in the order they happened: the threads, the bars and the enter origins read it. */
  const laneMarkers = useMemo(() => {
    const byLane = new Map<string, GanttMarker[]>();
    for (const marker of markers) {
      const list = byLane.get(marker.laneId);
      if (list) {
        list.push(marker);
      } else {
        byLane.set(marker.laneId, [marker]);
      }
    }
    for (const list of byLane.values()) {
      list.sort((left, right) => left.timestamp - right.timestamp);
    }
    return byLane;
  }, [markers]);

  const scale: GanttScale = useMemo(
    () =>
      axis === 'event'
        ? eventScale({ times: markers.map((marker) => marker.timestamp), step: eventStep, pad: PAD_X })
        : timeScale({ range, width, pad: PAD_X }),
    [axis, markers, eventStep, range, width],
  );
  const isEntering = useEnter(markers.map((marker) => marker.id));

  const x = scale.at;
  const rowY = (index: number): number => HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2;
  const openSource = (lane: GanttLane): GanttMarker | undefined =>
    lane.openedFrom && markerById.get(lane.openedFrom.markerId);

  // Where each node is drawn: its own place, or — for the one frame in which it arrives — the place it
  // came from, which is what the transitions below then travel out of. A lane's first node comes from
  // the node the lane opened out of, so a lane reads as branching from whatever caused it.
  const markerX = new Map<string, number>();
  // The newest node of a lane that is still running: the end the next event will land on, and the
  // one thing in the drawing that is not yet history.
  const activeEdges = new Set<string>();
  for (const [laneId, list] of laneMarkers) {
    const row = rowById.get(laneId);
    if (!row) {
      continue;
    }
    const newest = list[list.length - 1];
    if (row.lane.status === 'running' && newest) {
      activeEdges.add(newest.id);
    }
    list.forEach((marker, index) => {
      const previous = index > 0 ? list[index - 1] : undefined;
      const source = previous ? undefined : openSource(row.lane);
      const origin = previous ? x(previous.timestamp) : source && x(source.timestamp);
      const resting = x(marker.timestamp);
      markerX.set(marker.id, animate && origin !== undefined && isEntering(marker.id) ? origin : resting);
    });
  }

  /**
   * A lane's drawn stretches, one per segment. An open segment reaches its last node rather than
   * `now`: a lane with no fresh event is not shown as still busy, and taking the node's drawn
   * position rather than its instant is what makes the bar grow with an arriving event instead of
   * jumping ahead of it.
   */
  const stretchesOf = (lane: GanttLane): Stretch[] => {
    const list = laneMarkers.get(lane.id) ?? [];
    const segments = lane.segments ?? [];
    return segments.map((segment, index) => {
      const upper = segment.end ?? segments[index + 1]?.start ?? Number.MAX_SAFE_INTEGER;
      const inside = list.filter((marker) => marker.timestamp >= segment.start && marker.timestamp <= upper);
      const first = inside[0];
      const last = inside[inside.length - 1];
      const from = x(segment.start);
      const to =
        segment.end !== undefined
          ? x(segment.end)
          : last
            ? (markerX.get(last.id) ?? x(last.timestamp))
            : now !== undefined
              ? x(now)
              : from;
      const threaded = inside.length > 1 && first && last;
      return {
        from,
        to: Math.max(to, from),
        threadFrom: threaded ? markerX.get(first.id) : undefined,
        threadTo: threaded ? markerX.get(last.id) : undefined,
      };
    });
  };

  // A lane whose first node has just arrived is opening: its bar extends from its own beginning
  // rather than appearing at full length, and the connector that caused it draws out to meet it.
  const isOpening = (lane: GanttLane): boolean => {
    const first = laneMarkers.get(lane.id)?.[0];
    return animate === true && first !== undefined && isEntering(first.id);
  };

  const height = HEADER_HEIGHT + rows.length * ROW_HEIGHT;
  const grow = animate && mx('transition-[width]', ENTER_TRANSITION);

  // The event axis grows to the right, so the newest event has to be followed — but only a drawing
  // that just grew, and only while the reader is at its edge. On first paint they are at the start of
  // the history, which is where they should be; having scrolled back, they are reading, not watching.
  useEffect(() => {
    const element = viewportRef.current;
    const grown = drawnRef.current !== undefined && scale.width > drawnRef.current;
    drawnRef.current = scale.width;
    if (element && grown && followRef.current) {
      // Glided rather than jumped: the drawing is unchanged to the left of the new event, and a jump
      // asks the reader to re-find their place in it every time one arrives. Honour a reader who has
      // asked for less motion, and fall back where `scrollTo` options are not understood.
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      glideRef.current = !reduced;
      if (reduced || typeof element.scrollTo !== 'function') {
        element.scrollLeft = element.scrollWidth;
      } else {
        element.scrollTo({ left: element.scrollWidth, behavior: 'smooth' });
      }
    }
  }, [scale.width]);

  return (
    <ScrollArea.Root thin orientation='horizontal' classNames={classNames} ref={forwardedRef}>
      <ScrollArea.Viewport ref={viewportRef}>
        <svg
          // Pixel coordinates against the drawing's own width, with no viewBox: a viewBox would
          // letterbox the drawing to the column's aspect ratio and shrink every node with it.
          className='shrink-0 min-w-full'
          style={{ width: scale.width, height }}
        >
          {scale.ticks.map(({ at, label }, index) => (
            <g key={index}>
              <line x1={at} x2={at} y1={HEADER_HEIGHT} y2={height} className='stroke-separator' />
              <text
                x={at}
                y={HEADER_HEIGHT - 6}
                // Anchored inward at the drawing's own edges, so no label is drawn outside it.
                textAnchor={at <= PAD_X ? 'start' : at >= scale.width - PAD_X ? 'end' : 'middle'}
                className='fill-current text-subdued'
              >
                {label}
              </text>
            </g>
          ))}

          {/* Under the lanes and connectors: a dependency on a still-running lane anchors at `now`
              and would otherwise be hidden by this line. */}
          {now !== undefined && showNow && (
            <line
              x1={x(now)}
              x2={x(now)}
              y1={0}
              y2={height}
              strokeDasharray='3 3'
              className={STATUS_COLOR.running.thread}
            />
          )}

          {/* A group's rectangle encloses its band — the lanes it holds, and only those: a nested
              group is a band of its own, drawn further down. */}
          {bands.flatMap(({ group, first, last }) => {
            const stretches = rows.slice(first, last + 1).flatMap((row) => stretchesOf(row.lane));
            if (stretches.length === 0) {
              return [];
            }
            const left = Math.min(...stretches.map((stretch) => stretch.from)) - BAR_OVERHANG - GROUP_PAD;
            const right = Math.max(...stretches.map((stretch) => stretch.to)) + BAR_OVERHANG + GROUP_PAD;
            return [
              <rect
                key={`band:${group.id}`}
                x={left}
                y={rowY(first) - ROW_HEIGHT / 2 + GROUP_INSET}
                width={Math.max(right - left, ROW_HEIGHT)}
                height={(last - first + 1) * ROW_HEIGHT - 2 * GROUP_INSET}
                rx={GROUP_RADIUS}
                className={mx('fill-input-surface', grow)}
              />,
            ];
          })}

          {/* Connectors next, so the drop to a lane passes beneath any bar it crosses. */}
          {rows.flatMap(({ lane, index }) =>
            (lane.blockedOn ?? []).flatMap((depId) => {
              const dep = rowById.get(depId);
              if (!dep) {
                return [];
              }
              // Anchored on the end of the dependency's last stretch, so the line meets a node rather
              // than a bar edge.
              const stretches = stretchesOf(dep.lane);
              const anchor = stretches[stretches.length - 1];
              if (!anchor) {
                return [];
              }
              const anchorX = anchor.to;
              return [
                <line
                  key={`${lane.id}:${depId}`}
                  x1={anchorX}
                  x2={anchorX}
                  y1={rowY(dep.index)}
                  y2={rowY(index)}
                  strokeDasharray='2 2'
                  className={STATUS_COLOR.blocked.thread}
                />,
                // A waiter with no bar has nothing on its row for the line to reach, so it ends on a
                // hollow node: the point the waiter is held at until the dependency resolves.
                ...((lane.segments ?? []).length === 0
                  ? [
                      <circle
                        key={`${lane.id}:${depId}:hold`}
                        cx={anchorX}
                        cy={rowY(index)}
                        r={NODE_RADIUS}
                        strokeDasharray='2 2'
                        className={mx('fill-base-surface', STATUS_COLOR.blocked.thread)}
                      />,
                    ]
                  : []),
              ];
            }),
          )}

          {/* Down from the node a lane opened out of, a quarter bend, then right to where it begins. */}
          {rows.flatMap(({ lane, index }) => {
            const source = openSource(lane);
            const sourceRow = lane.openedFrom && rowById.get(lane.openedFrom.laneId);
            const stretches = stretchesOf(lane);
            if (!source || !sourceRow || stretches.length === 0) {
              return [];
            }
            const sourceX = x(source.timestamp);
            const y = rowY(index);
            const targetX = stretches[0].from;
            // Down, a quarter bend, then right to where the lane begins — but only while there is
            // somewhere forward to go. A lane that begins at or before the node that opened it has no
            // run to make, and bending anyway would hook the connector sideways into the middle of its
            // own bar; the drop lands on the row instead. The bar stays where the data puts it either
            // way: a connector doubling back over itself reads as a line to somewhere else entirely.
            const path =
              targetX > sourceX + BEND_RADIUS
                ? `M ${sourceX} ${rowY(sourceRow.index)} V ${y - BEND_RADIUS} Q ${sourceX} ${y} ${sourceX + BEND_RADIUS} ${y} H ${targetX}`
                : `M ${sourceX} ${rowY(sourceRow.index)} V ${y}`;
            return [
              <path
                key={`opened:${lane.id}`}
                d={path}
                fill='none'
                // Drawn on by its dash rather than by its shape: `d` is beyond what a transition can
                // reach, while `stroke-dashoffset` is a property every renderer animates. `pathLength`
                // normalises the path to 1 so one dash covers it whatever its actual length — which is
                // also why these are inert, and the connector solid, when it is not opening.
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={isOpening(lane) ? 1 : 0}
                className={mx(animate && mx('transition-[stroke-dashoffset]', ENTER_TRANSITION), CONNECTOR_CLASSNAME)}
              />,
            ];
          })}

          {/* Back out of the lane's last stretch and up into the node its result answered. Dashed, and
              the spawn is not: one is the moment work was handed over, the other the moment an answer
              arrived, and a reader following a cascade needs to tell the two directions apart. */}
          {rows.flatMap(({ lane, index }) => {
            const target = lane.closedInto && markerById.get(lane.closedInto.markerId);
            const targetRow = lane.closedInto && rowById.get(lane.closedInto.laneId);
            const stretches = stretchesOf(lane);
            const last = stretches[stretches.length - 1];
            if (!target || !targetRow || !last) {
              return [];
            }
            const targetX = x(target.timestamp);
            const y = rowY(index);
            const targetY = rowY(targetRow.index);
            // Which way the bend turns depends on whether the answer went up the chart or down it;
            // a lane is normally below the one it reports to, but nothing in the model requires it.
            const rise = Math.sign(targetY - y) * BEND_RADIUS;
            // Forward only, for the same reason the spawn connector is: a run doubling back reads as
            // a line to somewhere else. With nowhere to run, the rise happens at the answer's own node.
            const path =
              targetX > last.to + BEND_RADIUS
                ? `M ${last.to} ${y} H ${targetX - BEND_RADIUS} Q ${targetX} ${y} ${targetX} ${y + rise} V ${targetY}`
                : `M ${targetX} ${y} V ${targetY}`;
            return [
              <path
                key={`closed:${lane.id}`}
                d={path}
                fill='none'
                strokeDasharray='3 2'
                className={CONNECTOR_CLASSNAME}
              />,
            ];
          })}

          {/* One bar per segment: the gaps between them are the stretches the lane was not worked. */}
          {rows.flatMap(({ lane, index }) =>
            stretchesOf(lane).map((stretch, segment) => {
              const start = stretch.from - BAR_OVERHANG;
              const bar = {
                x: start,
                y: rowY(index) - BAR_HEIGHT / 2,
                // An opening lane is a dot at its own beginning for one frame, so it extends from where
                // the connector lands instead of being there at full length before the connector is.
                width: isOpening(lane) ? BAR_HEIGHT : Math.max(stretch.to + BAR_OVERHANG - start, BAR_HEIGHT),
                height: BAR_HEIGHT,
                rx: BAR_HEIGHT / 2,
              };
              // An opaque backing under the translucent tint: the connectors pass beneath the bars, and
              // without it they would show through.
              return (
                <g key={`${lane.id}:${segment}`} className='cursor-pointer' onClick={() => onLaneSelect?.(lane)}>
                  <rect {...bar} className={mx('fill-base-surface', grow)} />
                  <rect {...bar} className={mx(STATUS_COLOR[lane.status].fill, grow)} />
                </g>
              );
            }),
          )}

          {/* The thread through a segment's nodes, so a stretch reads as a sequence rather than dots. */}
          {rows.flatMap(({ lane, index }) =>
            stretchesOf(lane).flatMap((stretch, segment) =>
              stretch.threadFrom === undefined || stretch.threadTo === undefined
                ? []
                : [
                    // A hairline rect rather than a line: a line's `x1`/`x2` are attributes and nothing
                    // else, while `x` and `width` are geometry properties a transition can reach, so the
                    // thread grows with the node it is reaching for instead of arriving ahead of it.
                    <rect
                      key={`thread:${lane.id}:${segment}`}
                      x={stretch.threadFrom}
                      y={rowY(index) - THREAD_HEIGHT / 2}
                      width={Math.max(stretch.threadTo - stretch.threadFrom, 0)}
                      height={THREAD_HEIGHT}
                      className={mx(
                        animate && mx('transition-[x,width]', ENTER_TRANSITION),
                        STATUS_COLOR[lane.status].node,
                      )}
                    />,
                  ],
            ),
          )}

          {/* Nodes last, over the bars and every line, so a line reads as ending at a node's centre. */}
          {markers.map((marker) => {
            const row = rowById.get(marker.laneId);
            const cx = markerX.get(marker.id);
            return row && cx !== undefined ? (
              <HoverCard.Root key={marker.id}>
                <HoverCard.Trigger asChild>
                  <circle
                    cx={cx}
                    cy={rowY(row.index)}
                    r={NODE_RADIUS}
                    className={mx(
                      'cursor-pointer stroke-base-surface hover:stroke-[3px] hover:stroke-base-fg',
                      // `cx` as a transition: where a browser exposes SVG geometry as CSS the node
                      // slides out of the one before it, and where it does not it simply appears.
                      animate ? mx('transition-[stroke-width,cx]', ENTER_TRANSITION) : 'transition-[stroke-width]',
                      // The live end pulses in the lane's stronger shade: scanning a wall of finished
                      // lanes, the ones still moving should be findable without reading the legend.
                      activeEdges.has(marker.id)
                        ? mx('animate-pulse', STATUS_COLOR[row.lane.status].edge)
                        : STATUS_COLOR[row.lane.status].node,
                    )}
                    onClick={() => onMarkerSelect?.(marker)}
                  />
                </HoverCard.Trigger>
                <HoverCard.Portal>
                  <HoverCard.Content classNames='p-2 max-w-72 text-xs font-mono'>
                    <div className='font-medium truncate'>{marker.label}</div>
                    <div className='text-description'>
                      {marker.kind && `${marker.kind} · `}
                      {format(marker.timestamp, 'HH:mm:ss.SSS')}
                      {marker.level && marker.level !== 'info' && (
                        <span
                          className={mx('ms-2', marker.level === 'error' ? 'text-error-text' : 'text-warning-text')}
                        >
                          {marker.level}
                        </span>
                      )}
                    </div>
                    <div className='text-description truncate'>{row.lane.label}</div>
                    <HoverCard.Arrow />
                  </HoverCard.Content>
                </HoverCard.Portal>
              </HoverCard.Root>
            ) : null;
          })}
        </svg>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
});

GanttChart.displayName = 'Gantt.Chart';

export const Gantt = {
  Root: GanttRoot,
  Legend: GanttLegend,
  Chart: GanttChart,
  Meta: GanttMeta,
};

export type { GanttChartProps, GanttLegendProps, GanttMetaProps, GanttRootProps };
