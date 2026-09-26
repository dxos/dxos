//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import { v2025_03_26 } from 'effect/unstable/ai/McpProtocol';
import React, { type KeyboardEvent, type ReactNode, forwardRef, useEffect, useMemo, useRef, useState } from 'react';

import { createContext } from '@dxos/react-hooks';
import { HoverCard, ScrollArea, type ThemedClassName, composable, composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { Unit } from '@dxos/util';

import { type GanttAxis, type GanttScale, eventScale, timeScale } from './gantt-scale.ts';
import { useEnter } from './useEnter.ts';

export type GanttLaneKind = 'session' | 'task';
export type GanttLaneStatus = 'pending' | 'blocked' | 'running' | 'review' | 'done' | 'failed';
export type GanttMarkerKind = 'request' | 'operation' | 'tool' | 'message' | 'error' | 'delegation' | 'task';

export type GanttLane = {
  id: string;
  kind: GanttLaneKind;
  label: string;
  status: GanttLaneStatus;
  start?: number;
  end?: number;
  parentId?: string;
  taskId?: string;
  blockedOn?: readonly string[];
  delegatedFrom?: { laneId: string; markerId: string };
  tokens?: { input: number; output: number; total: number };
  toolCalls?: number;
};

export type GanttMarker = {
  id: string;
  laneId: string;
  kind: GanttMarkerKind;
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

/** Gap between adjacent session rectangles, halved on each. */
const GROUP_INSET = 2;
/** The rectangle's clearance around its bars, the same on every side, so its corners stay concentric with theirs. */
const GROUP_PAD = ROW_HEIGHT / 2 - BAR_HEIGHT / 2 - GROUP_INSET;
const GROUP_RADIUS = BAR_HEIGHT / 2 + GROUP_PAD;

/** Radius of the delegation connector's bend from the drop into the child bar. */
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

const DEPENDENCY_CLASSNAME = 'stroke-fuchsia-500';

type Row = {
  lane: GanttLane;
  depth: number;
  index: number;
  sessionId: string | undefined;
};

/** A session's rows: the session itself followed by every task it works in-session, contiguous. */
type SessionGroup = {
  session: GanttLane;
  first: number;
  last: number;
};

/**
 * Rows grouped by the session that processes them: a session, then the tasks (and subtasks) it
 * works itself, then — after that block — every session those tasks spawned, recursively. Keeping a
 * session's own rows contiguous is what lets one rectangle enclose them.
 */
const orderRows = (lanes: readonly GanttLane[]): { rows: Row[]; groups: SessionGroup[] } => {
  const rows: Row[] = [];
  const groups: SessionGroup[] = [];
  const childrenOf = (parentId: string | undefined): GanttLane[] => lanes.filter((lane) => lane.parentId === parentId);

  const visitSession = (session: GanttLane, depth: number): void => {
    const first = rows.length;
    rows.push({ lane: session, depth, index: rows.length, sessionId: session.id });
    const spawned: { lane: GanttLane; depth: number }[] = [];
    const visitTasks = (parentId: string, taskDepth: number): void => {
      for (const child of childrenOf(parentId)) {
        if (child.kind === 'task') {
          rows.push({ lane: child, depth: taskDepth, index: rows.length, sessionId: session.id });
          visitTasks(child.id, taskDepth + 1);
        } else {
          spawned.push({ lane: child, depth: taskDepth });
        }
      }
    };
    visitTasks(session.id, depth + 1);
    groups.push({ session, first, last: rows.length - 1 });
    for (const child of spawned) {
      visitSession(child.lane, child.depth);
    }
  };

  for (const lane of childrenOf(undefined)) {
    if (lane.kind === 'session') {
      visitSession(lane, 0);
    } else {
      rows.push({ lane, depth: 0, index: rows.length, sessionId: undefined });
    }
  }
  return { rows, groups };
};

const formatTokens = (tokens: NonNullable<GanttLane['tokens']>): string =>
  tokens.total >= 1_000 ? Unit.Thousand(tokens.total).toString() : String(tokens.total);

export type GanttData = {
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
   * Slide a newly arrived event out of the one before it — out of the node that spawned its lane, for
   * a lane's first — and grow its bar to meet it. Only events that arrive while the chart is on screen
   * animate, so a chart that is merely mounted is still.
   */
  animate?: boolean;
  onLaneSelect?: (lane: GanttLane) => void;
  onMarkerSelect?: (marker: GanttMarker) => void;
};

/** What every part reads: the ordered rows and the shared time axis, resolved once by the root. */
type GanttContextValue = {
  rows: Row[];
  groups: SessionGroup[];
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
 * Gantt view of sessions and tasks on a shared time axis. The root resolves the rows and the axis;
 * the parts lay out side by side in the order given, sharing one row grid: `Legend` names the
 * lanes, `Chart` draws them, `Meta` shows per-lane totals. A host that already lists the lanes
 * renders the chart alone.
 */
const GanttRoot = composable<HTMLDivElement, GanttRootProps>(
  (
    {
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
    const { rows, groups } = useMemo(() => orderRows(lanes), [lanes]);
    const rowById = useMemo(() => new Map(rows.map((row) => [row.lane.id, row])), [rows]);
    const markerById = useMemo(() => new Map(markers.map((marker) => [marker.id, marker])), [markers]);
    const range = useMemo(() => {
      if (rangeProp) {
        return rangeProp;
      }
      const times = [...lanes.flatMap((lane) => [lane.start, lane.end]), ...markers.map((marker) => marker.timestamp)]
        .filter((time): time is number => time !== undefined)
        .concat(now === undefined ? [] : [now]);
      const start = times.length > 0 ? Math.min(...times) : 0;
      return { start, end: times.length > 0 ? Math.max(...times) : start };
    }, [rangeProp, lanes, markers, now]);

    return (
      <GanttProvider
        rows={rows}
        groups={groups}
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

/** Per-lane totals — tokens and tool calls — aligned to the rows. */
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
          {lane.tokens && (
            <span title={`${lane.tokens.input} in / ${lane.tokens.output} out`}>{formatTokens(lane.tokens)}</span>
          )}
          {lane.toolCalls !== undefined && <span>{lane.toolCalls} tools</span>}
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

/**
 * The drawing: every lane is a rounded bar with its markers threaded through it as nodes, a session's
 * rectangle encloses the tasks it works, and connectors draw dependencies and delegations.
 *
 * The part owns its horizontal scroll: on the `event` axis the drawing is as wide as the events need
 * and follows the newest of them, while the legend beside it stays where it is.
 */
const GanttChart = forwardRef<HTMLDivElement, GanttChartProps>(({ classNames }, forwardedRef) => {
  const {
    rows,
    groups,
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
      followRef.current = element.scrollWidth - element.clientWidth - element.scrollLeft <= FOLLOW_SLACK;
    };
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', onScroll);
    };
  }, []);

  /** Each lane's markers in the order they happened: the thread, the bars and the enter origins read it. */
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
  const delegationSource = (lane: GanttLane): GanttMarker | undefined =>
    lane.delegatedFrom && markerById.get(lane.delegatedFrom.markerId);
  // A delegated lane's bar begins where the connector's bend lands, never under the drop from the
  // parent node: the drop is at the spawn instant and the child starts at or after it.
  const barStart = (lane: GanttLane, start: number): number => {
    const source = delegationSource(lane);
    const edge = x(start) - BAR_OVERHANG;
    // Past the bend the connector runs level for one more radius before the bar begins.
    return source ? Math.max(edge, x(source.timestamp) + 2 * BEND_RADIUS) : edge;
  };
  // A node never sits outside its bar: a delegated lane's first event is the spawn instant itself,
  // which is where the connector drops, so that node is nudged in past the bar's edge.
  const nodeX = (lane: GanttLane, time: number): number =>
    lane.start === undefined ? x(time) : Math.max(x(time), barStart(lane, lane.start) + BAR_OVERHANG);

  // Where each node is drawn: its own place, or — for the one frame in which it arrives — the place it
  // came from, which is what the transitions below then travel out of. A lane's first node comes from
  // the node that spawned the lane, so a delegated lane reads as opening out of its parent.
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
      const source = previous ? undefined : delegationSource(row.lane);
      const origin = previous ? nodeX(row.lane, previous.timestamp) : source && x(source.timestamp);
      const resting = nodeX(row.lane, marker.timestamp);
      markerX.set(marker.id, animate && origin !== undefined && isEntering(marker.id) ? origin : resting);
    });
  }

  // A bar reaches its last node, not `now`: a lane without a fresh event is not shown as still busy,
  // and a terminated one ends where its last event did. Taking the node's drawn position rather than
  // its instant is what makes the bar grow with an arriving event instead of jumping ahead of it.
  const laneEndX = (lane: GanttLane): number | undefined => {
    const list = laneMarkers.get(lane.id);
    if (list && list.length > 0) {
      return markerX.get(list[list.length - 1].id);
    }
    const end = lane.end ?? now;
    return end === undefined ? undefined : x(end);
  };

  // A lane whose first node has just arrived is opening: its bar extends from its own beginning
  // rather than appearing at full length, and the connector that spawned it draws out to meet it.
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
      element.scrollLeft = element.scrollWidth;
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

          {/* A session's rectangle encloses its own bar and the tasks it works in-session; a task it
            spawned is a session of its own, drawn as a rectangle further down. */}
          {groups.flatMap(({ session, first, last }) => {
            const members = rows.slice(first, last + 1).map((row) => row.lane);
            const starts = members.flatMap((lane) => (lane.start === undefined ? [] : [barStart(lane, lane.start)]));
            // Only lanes with a bar bound the rectangle: a task not yet started has no extent.
            const ends = members.flatMap((lane) => {
              const end = lane.start === undefined ? undefined : laneEndX(lane);
              return end === undefined ? [] : [end + BAR_OVERHANG];
            });
            if (starts.length === 0 || ends.length === 0) {
              return [];
            }
            const left = Math.min(...starts) - GROUP_PAD;
            const right = Math.max(...ends) + GROUP_PAD;
            return [
              <rect
                key={`group:${session.id}`}
                x={left}
                y={rowY(first) - ROW_HEIGHT / 2 + GROUP_INSET}
                width={Math.max(right - left, ROW_HEIGHT)}
                height={(last - first + 1) * ROW_HEIGHT - 2 * GROUP_INSET}
                rx={GROUP_RADIUS}
                className={mx('fill-input-surface', grow)}
              />,
            ];
          })}

          {/* Connectors next, so the drop to a child passes beneath any bar it crosses. */}
          {rows.flatMap(({ lane, index }) =>
            (lane.blockedOn ?? []).flatMap((depId) => {
              const dep = rowById.get(depId);
              if (!dep) {
                return [];
              }
              // Anchored on the dependency's last node, so the line meets a node rather than a bar edge.
              const anchorX =
                laneEndX(dep.lane) ?? (dep.lane.start === undefined ? undefined : nodeX(dep.lane, dep.lane.start));
              if (anchorX === undefined) {
                return [];
              }
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
                ...(lane.start === undefined
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

          {/* Down from the parent node, a quarter bend, then right to the centre of the child's first node. */}
          {rows.flatMap(({ lane, index }) => {
            const source = delegationSource(lane);
            const sourceRow = lane.delegatedFrom && rowById.get(lane.delegatedFrom.laneId);
            if (!source || !sourceRow || lane.start === undefined) {
              return [];
            }
            const sourceX = x(source.timestamp);
            const y = rowY(index);
            const firstNode = laneMarkers.get(lane.id)?.[0];
            // The run ends where the child's first node comes to rest, so an arriving node travels
            // along the connector rather than dragging its end along with it.
            const targetX = firstNode ? nodeX(lane, firstNode.timestamp) : barStart(lane, lane.start) + BAR_OVERHANG;
            return [
              <path
                key={`delegation:${lane.id}`}
                d={`M ${sourceX} ${rowY(sourceRow.index)} V ${y - BEND_RADIUS} Q ${sourceX} ${y} ${sourceX + BEND_RADIUS} ${y} H ${targetX}`}
                fill='none'
                // Drawn on by its dash rather than by its shape: `d` is beyond what a transition can
                // reach, while `stroke-dashoffset` is a property every renderer animates. `pathLength`
                // normalises the path to 1 so one dash covers it whatever its actual length — which is
                // also why these are inert, and the connector solid, when it is not opening.
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={isOpening(lane) ? 1 : 0}
                className={mx(animate && mx('transition-[stroke-dashoffset]', ENTER_TRANSITION), DEPENDENCY_CLASSNAME)}
              />,
            ];
          })}

          {rows.map(({ lane, index }) => {
            const endX = laneEndX(lane);
            if (lane.start === undefined || endX === undefined) {
              return null;
            }
            const start = barStart(lane, lane.start);
            const bar = {
              x: start,
              y: rowY(index) - BAR_HEIGHT / 2,
              // An opening lane is a dot at its own beginning for one frame, so it extends from where
              // the connector lands instead of being there at full length before the connector is.
              width: isOpening(lane) ? BAR_HEIGHT : Math.max(endX + BAR_OVERHANG - start, BAR_HEIGHT),
              height: BAR_HEIGHT,
              rx: BAR_HEIGHT / 2,
            };
            // An opaque backing under the translucent tint: the connectors pass beneath the bars, and
            // without it they would show through.
            return (
              <g key={lane.id} className='cursor-pointer' onClick={() => onLaneSelect?.(lane)}>
                <rect {...bar} className={mx('fill-base-surface', grow)} />
                <rect {...bar} className={mx(STATUS_COLOR[lane.status].fill, grow)} />
              </g>
            );
          })}

          {/* The thread through a lane's nodes, so a row reads as a sequence rather than scattered dots. */}
          {rows.map(({ lane, index }) => {
            const list = laneMarkers.get(lane.id) ?? [];
            const from = list.length > 1 ? markerX.get(list[0].id) : undefined;
            const to = list.length > 1 ? markerX.get(list[list.length - 1].id) : undefined;
            if (from === undefined || to === undefined) {
              return null;
            }
            // A hairline rect rather than a line: a line's `x1`/`x2` are attributes and nothing else,
            // while `x` and `width` are geometry properties a transition can reach, so the thread can
            // grow with the node it is reaching for instead of arriving ahead of it. The node's fill is
            // the thread's own shade.
            return (
              <rect
                key={`thread:${lane.id}`}
                x={from}
                y={rowY(index) - THREAD_HEIGHT / 2}
                width={Math.max(to - from, 0)}
                height={THREAD_HEIGHT}
                className={mx(animate && mx('transition-[x,width]', ENTER_TRANSITION), STATUS_COLOR[lane.status].node)}
              />
            );
          })}

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
                      {marker.kind} · {format(marker.timestamp, 'HH:mm:ss.SSS')}
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
