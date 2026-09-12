//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';

import { type ThemedClassName, composable, composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { Unit } from '@dxos/util';

export type GanttLaneKind = 'session' | 'task';
export type GanttLaneStatus = 'pending' | 'blocked' | 'running' | 'review' | 'done' | 'failed';
export type GanttMarkerKind = 'request' | 'operation' | 'tool' | 'message' | 'error' | 'delegation';

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

export type GanttProps = ThemedClassName<{
  lanes: readonly GanttLane[];
  markers?: readonly GanttMarker[];
  range?: { start: number; end: number };
  now?: number;
  onLaneSelect?: (lane: GanttLane) => void;
  onMarkerSelect?: (marker: GanttMarker) => void;
}>;

const ROW_HEIGHT = 28;
const HEADER_HEIGHT = 20;
const PAD_X = 12;
const NODE_RADIUS = 5;
/** Upper bound on axis ticks; the count shrinks with the width so `HH:mm:ss` labels never overlap. */
const MAX_TICKS = 5;
const TICK_MIN_WIDTH = 72;

const BAR_HEIGHT = 15;
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
 * hue in a lighter shade.
 */
const STATUS_COLOR: Record<GanttLaneStatus, { fill: string; node: string; thread: string; text: string }> = {
  pending: {
    fill: 'fill-neutral-500/40',
    node: 'fill-neutral-300',
    thread: 'stroke-neutral-300',
    text: 'text-neutral-400',
  },
  blocked: {
    fill: 'fill-orange-500/40',
    node: 'fill-orange-300',
    thread: 'stroke-orange-300',
    text: 'text-orange-500',
  },
  running: { fill: 'fill-sky-500/40', node: 'fill-sky-300', thread: 'stroke-sky-300', text: 'text-sky-500' },
  review: { fill: 'fill-cyan-500/40', node: 'fill-cyan-300', thread: 'stroke-cyan-300', text: 'text-cyan-500' },
  done: { fill: 'fill-green-500/40', node: 'fill-green-300', thread: 'stroke-green-300', text: 'text-green-500' },
  failed: { fill: 'fill-red-500/40', node: 'fill-red-300', thread: 'stroke-red-300', text: 'text-red-500' },
};

type Row = { lane: GanttLane; depth: number; index: number; sessionId: string | undefined };

/** A session's rows: the session itself followed by every task it works in-session, contiguous. */
type SessionGroup = { session: GanttLane; first: number; last: number };

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

/**
 * Gantt view of sessions and tasks on a shared time axis: every lane is a rounded bar with its markers
 * threaded through it as nodes, tasks are grouped under their session, and connectors draw task
 * dependencies and delegations.
 */
export const Gantt = composable<HTMLDivElement, GanttProps>(
  ({ lanes, markers = [], range: rangeProp, now, onLaneSelect, onMarkerSelect, ...props }, forwardedRef) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [width, setWidth] = useState(600);
    useEffect(() => {
      const element = svgRef.current;
      if (!element) {
        return;
      }
      const observer = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width));
      observer.observe(element);
      return () => observer.disconnect();
    }, []);

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

    const span = Math.max(range.end - range.start, 1);
    const x = (time: number): number => PAD_X + ((time - range.start) / span) * (width - 2 * PAD_X);
    const rowY = (index: number): number => HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2;
    const laneTimes = (lane: GanttLane): number[] =>
      markers.filter((marker) => marker.laneId === lane.id).map((marker) => marker.timestamp);
    // A bar reaches its last node, not `now`: a lane without a fresh event is not shown as still
    // busy, and a terminated one ends where its last event did.
    const laneEnd = (lane: GanttLane): number | undefined => {
      const times = laneTimes(lane);
      return times.length > 0 ? Math.max(...times) : (lane.end ?? now);
    };
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
    const height = HEADER_HEIGHT + rows.length * ROW_HEIGHT;
    const tickCount = Math.max(2, Math.min(MAX_TICKS, Math.floor((width - 2 * PAD_X) / TICK_MIN_WIDTH)));
    const ticks = Array.from({ length: tickCount }, (_, index) => range.start + (span * index) / (tickCount - 1));

    return (
      <div
        {...composableProps(props, {
          // `content-start auto-rows-min`: a stretching host would otherwise spread the rows over its
          // height, and the chart is drawn in pixel rows.
          classNames:
            'grid w-full grid-cols-[minmax(10rem,20rem)_1fr_auto] content-start auto-rows-min text-xs font-mono overflow-hidden',
        })}
        ref={forwardedRef}
      >
        <div className='col-start-1 row-start-1' style={{ height: HEADER_HEIGHT }} />
        <div className='col-start-3 row-start-1' style={{ height: HEADER_HEIGHT }} />
        {rows.map(({ lane, depth }) => (
          <Fragment key={lane.id}>
            <div
              // The label row is the lane's keyboard path; the SVG shapes stay pointer-only.
              role='button'
              tabIndex={0}
              className='col-start-1 flex items-center gap-2 truncate cursor-pointer hover:bg-hover-surface-subtle'
              style={{ height: ROW_HEIGHT, paddingInlineStart: `${0.5 + depth}rem` }}
              onClick={() => onLaneSelect?.(lane)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onLaneSelect?.(lane);
                }
              }}
            >
              <span className={mx('shrink-0 w-2 h-2 rounded-full bg-current', STATUS_COLOR[lane.status].text)} />
              <span className='truncate text-base-fg'>{lane.label}</span>
            </div>
            <div
              className='col-start-3 flex items-center justify-end gap-2 px-2 text-subdued whitespace-nowrap'
              style={{ height: ROW_HEIGHT }}
            >
              {lane.tokens && (
                <span title={`${lane.tokens.input} in / ${lane.tokens.output} out`}>{formatTokens(lane.tokens)}</span>
              )}
              {lane.toolCalls !== undefined && <span>{lane.toolCalls} tools</span>}
            </div>
          </Fragment>
        ))}
        <svg
          ref={svgRef}
          className='col-start-2 min-w-0'
          // Pixel coordinates against the measured width, with no viewBox: a viewBox would letterbox
          // the drawing to the column's aspect ratio and shrink every node with it.
          style={{ gridRow: `1 / span ${rows.length + 1}`, width: '100%', height }}
        >
          {ticks.map((tick, index) => (
            <g key={index}>
              <line x1={x(tick)} x2={x(tick)} y1={HEADER_HEIGHT} y2={height} className='stroke-separator' />
              <text
                x={x(tick)}
                y={HEADER_HEIGHT - 6}
                textAnchor={index === 0 ? 'start' : index === tickCount - 1 ? 'end' : 'middle'}
                className='fill-current text-subdued'
              >
                {format(tick, 'HH:mm:ss')}
              </text>
            </g>
          ))}

          {/* Under the lanes and connectors: a dependency on a still-running lane anchors at `now`
              and would otherwise be hidden by this line. */}
          {now !== undefined && (
            <line x1={x(now)} x2={x(now)} y1={0} y2={height} strokeDasharray='3 3' className='stroke-red-500' />
          )}

          {/* A session's rectangle encloses its own bar and the tasks it works in-session; a task it
              spawned is a session of its own, drawn as a rectangle further down. */}
          {groups.flatMap(({ session, first, last }) => {
            const members = rows.slice(first, last + 1).map((row) => row.lane);
            const starts = members.flatMap((lane) => (lane.start === undefined ? [] : [barStart(lane, lane.start)]));
            // Only lanes with a bar bound the rectangle: a task not yet started has no extent.
            const ends = members.flatMap((lane) => {
              const end = lane.start === undefined ? undefined : laneEnd(lane);
              return end === undefined ? [] : [x(end) + BAR_OVERHANG];
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
                className='fill-input-surface'
              />,
            ];
          })}

          {/* Connectors next, so the drop to a child passes beneath any bar it crosses. */}
          {rows.flatMap(({ lane, index }) =>
            (lane.blockedOn ?? []).flatMap((depId) => {
              const dep = rowById.get(depId);
              // Anchored on the dependency's last node, so the line meets a node rather than a bar edge.
              const anchor = dep && (laneEnd(dep.lane) ?? dep.lane.start);
              return dep && anchor !== undefined
                ? [
                    <line
                      key={`${lane.id}:${depId}`}
                      x1={nodeX(dep.lane, anchor)}
                      x2={nodeX(dep.lane, anchor)}
                      y1={rowY(dep.index)}
                      y2={rowY(index)}
                      strokeDasharray='2 2'
                      className='stroke-orange-500'
                    />,
                  ]
                : [];
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
            const firstNode = Math.min(...laneTimes(lane));
            const targetX = Number.isFinite(firstNode)
              ? nodeX(lane, firstNode)
              : barStart(lane, lane.start) + BAR_OVERHANG;
            return [
              <path
                key={`delegation:${lane.id}`}
                d={`M ${sourceX} ${rowY(sourceRow.index)} V ${y - BEND_RADIUS} Q ${sourceX} ${y} ${sourceX + BEND_RADIUS} ${y} H ${targetX}`}
                fill='none'
                className='stroke-fuchsia-500'
              />,
            ];
          })}

          {rows.map(({ lane, index }) => {
            const end = laneEnd(lane);
            if (lane.start === undefined || end === undefined) {
              return null;
            }
            const bar = {
              x: barStart(lane, lane.start),
              y: rowY(index) - BAR_HEIGHT / 2,
              width: Math.max(x(end) + BAR_OVERHANG - barStart(lane, lane.start), BAR_HEIGHT),
              height: BAR_HEIGHT,
              rx: BAR_HEIGHT / 2,
            };
            // An opaque backing under the translucent tint: the connectors pass beneath the bars, and
            // without it they would show through.
            return (
              <g key={lane.id} className='cursor-pointer' onClick={() => onLaneSelect?.(lane)}>
                <rect {...bar} className='fill-base-surface' />
                <rect {...bar} className={STATUS_COLOR[lane.status].fill} />
              </g>
            );
          })}

          {/* The thread through a lane's nodes, so a row reads as a sequence rather than scattered dots. */}
          {rows.map(({ lane, index }) => {
            const times = laneTimes(lane);
            if (times.length < 2) {
              return null;
            }
            return (
              <line
                key={`thread:${lane.id}`}
                x1={nodeX(lane, Math.min(...times))}
                x2={nodeX(lane, Math.max(...times))}
                y1={rowY(index)}
                y2={rowY(index)}
                className={STATUS_COLOR[lane.status].thread}
              />
            );
          })}

          {/* Nodes last, over the bars and every line, so a line reads as ending at a node's centre. */}
          {markers.map((marker) => {
            const row = rowById.get(marker.laneId);
            return row ? (
              <circle
                key={marker.id}
                cx={nodeX(row.lane, marker.timestamp)}
                cy={rowY(row.index)}
                r={NODE_RADIUS}
                className={mx('cursor-pointer stroke-base-surface', STATUS_COLOR[row.lane.status].node)}
                onClick={() => onMarkerSelect?.(marker)}
              >
                <title>{marker.label}</title>
              </circle>
            ) : null;
          })}
        </svg>
      </div>
    );
  },
);

Gantt.displayName = 'Gantt';
