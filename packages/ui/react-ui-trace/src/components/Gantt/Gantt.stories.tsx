//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode, useEffect, useState } from 'react';

import { random } from '@dxos/random';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Gantt, type GanttData, type GanttGroup, type GanttLane, type GanttMarker } from './Gantt.tsx';

random.seed(1);

const T0 = Date.UTC(2026, 8, 11, 10, 0, 0);
const MINUTE = 60_000;
const SECOND = 1_000;

/** `count` markers spread evenly over `[start, end]`, which is all a static fixture needs. */
const events = (laneId: string, count: number, start: number, end: number, prefix = laneId): GanttMarker[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}:${index}`,
    laneId,
    kind: 'tool',
    timestamp: count < 2 ? start : start + ((end - start) * index) / (count - 1),
    label: random.lorem.word(),
  }));

//
// Fixture: a run of processes and the tasks they work, mapped onto the chart's own nouns.
//

/**
 * Process A works three tasks itself and spawns process B for one of them and process C for another.
 * Each process is a band; the tasks it works are lanes inside it; a spawned process is a band nested
 * under its parent's, whose own lane opens out of the exact node that spawned it.
 */
const groups: GanttGroup[] = [{ id: 'g:a' }, { id: 'g:b', parentId: 'g:a' }, { id: 'g:c', parentId: 'g:a' }];

const lanes: GanttLane[] = [
  {
    id: 'a',
    label: 'Process A — Plan the release',
    status: 'running',
    groupId: 'g:a',
    segments: [{ start: T0 }],
    meta: [{ label: '15.5k', title: '12400 in / 3100 out' }, { label: '6 tools' }],
  },
  {
    id: 'a:triage',
    label: 'Triage open issues',
    status: 'done',
    groupId: 'g:a',
    segments: [{ start: T0 + 0.5 * MINUTE, end: T0 + 1.8 * MINUTE }],
  },
  {
    id: 'a:docs',
    label: 'Update docs',
    status: 'failed',
    groupId: 'g:a',
    segments: [{ start: T0 + 2.4 * MINUTE, end: T0 + 3.6 * MINUTE }],
  },
  {
    id: 'a:announce',
    label: 'Publish announcement',
    status: 'blocked',
    groupId: 'g:a',
    blockedOn: ['c'],
  },
  {
    id: 'b',
    label: 'Process B — Draft changelog',
    status: 'done',
    groupId: 'g:b',
    segments: [{ start: T0 + 4.1 * MINUTE, end: T0 + 7.2 * MINUTE }],
    openedFrom: { laneId: 'a', markerId: 'm:a-spawn-b' },
    closedInto: { laneId: 'a', markerId: 'm:a-return-b' },
    meta: [{ label: '49.1k', title: '40200 in / 8900 out' }, { label: '4 tools' }],
  },
  {
    id: 'b:titles',
    label: 'Collect PR titles',
    status: 'done',
    groupId: 'g:b',
    segments: [{ start: T0 + 4.6 * MINUTE, end: T0 + 5.7 * MINUTE }],
  },
  {
    id: 'b:highlights',
    label: 'Write highlights',
    status: 'done',
    groupId: 'g:b',
    segments: [{ start: T0 + 6 * MINUTE, end: T0 + 6.9 * MINUTE }],
  },
  {
    id: 'c',
    label: 'Process C — Write release notes',
    status: 'running',
    groupId: 'g:c',
    segments: [{ start: T0 + 5.1 * MINUTE }],
    openedFrom: { laneId: 'a', markerId: 'm:a-spawn-c' },
    meta: [{ label: '8.9k', title: '8000 in / 900 out' }, { label: '2 tools' }],
  },
];

const markers: GanttMarker[] = [
  { id: 'm:a-begin', laneId: 'a', kind: 'request', timestamp: T0, label: 'Request started' },
  { id: 'm:a-user', laneId: 'a', kind: 'message', timestamp: T0 + 0.2 * MINUTE, label: 'Plan the release' },
  { id: 'm:a-spawn-b', laneId: 'a', kind: 'delegation', timestamp: T0 + 4 * MINUTE, label: 'Spawned process B' },
  { id: 'm:a-spawn-c', laneId: 'a', kind: 'delegation', timestamp: T0 + 5 * MINUTE, label: 'Spawned process C' },
  { id: 'm:a-end', laneId: 'a', kind: 'request', timestamp: T0 + 5.4 * MINUTE, label: 'Request success' },
  {
    id: 'm:a-return-b',
    laneId: 'a',
    kind: 'delegation',
    timestamp: T0 + 7.4 * MINUTE,
    label: 'Returned: changelog drafted',
  },

  { id: 'm:triage-start', laneId: 'a:triage', kind: 'operation', timestamp: T0 + 0.5 * MINUTE, label: 'Started' },
  { id: 'm:triage-tool', laneId: 'a:triage', kind: 'tool', timestamp: T0 + 1.1 * MINUTE, label: 'list-issues' },
  { id: 'm:triage-end', laneId: 'a:triage', kind: 'operation', timestamp: T0 + 1.8 * MINUTE, label: 'Done' },

  { id: 'm:docs-start', laneId: 'a:docs', kind: 'operation', timestamp: T0 + 2.4 * MINUTE, label: 'Started' },
  { id: 'm:docs-tool', laneId: 'a:docs', kind: 'tool', timestamp: T0 + 3 * MINUTE, label: 'search' },
  {
    id: 'm:docs-fail',
    laneId: 'a:docs',
    kind: 'error',
    timestamp: T0 + 3.6 * MINUTE,
    label: 'Add artifact',
    level: 'error',
  },

  { id: 'm:b-start', laneId: 'b', kind: 'operation', timestamp: T0 + 4.1 * MINUTE, label: 'Run Instructions' },
  { id: 'm:b-tool', laneId: 'b', kind: 'tool', timestamp: T0 + 4.3 * MINUTE, label: 'read-project' },
  { id: 'm:b-end', laneId: 'b', kind: 'operation', timestamp: T0 + 7.2 * MINUTE, label: 'Run Instructions' },

  { id: 'm:titles-start', laneId: 'b:titles', kind: 'operation', timestamp: T0 + 4.6 * MINUTE, label: 'Started' },
  { id: 'm:titles-tool', laneId: 'b:titles', kind: 'tool', timestamp: T0 + 5.2 * MINUTE, label: 'list-pull-requests' },
  { id: 'm:titles-end', laneId: 'b:titles', kind: 'operation', timestamp: T0 + 5.7 * MINUTE, label: 'Done' },

  { id: 'm:highlights-start', laneId: 'b:highlights', kind: 'operation', timestamp: T0 + 6 * MINUTE, label: 'Started' },
  {
    id: 'm:highlights-tool',
    laneId: 'b:highlights',
    kind: 'tool',
    timestamp: T0 + 6.4 * MINUTE,
    label: 'create-document',
  },
  { id: 'm:highlights-end', laneId: 'b:highlights', kind: 'operation', timestamp: T0 + 6.9 * MINUTE, label: 'Done' },

  { id: 'm:c-start', laneId: 'c', kind: 'operation', timestamp: T0 + 5.1 * MINUTE, label: 'Run Instructions' },
  { id: 'm:c-tool-1', laneId: 'c', kind: 'tool', timestamp: T0 + 6.6 * MINUTE, label: 'search' },
  { id: 'm:c-tool-2', laneId: 'c', kind: 'tool', timestamp: T0 + 8.3 * MINUTE, label: 'create-document' },
];

//
// Static fixtures: one shape of the model each, with nothing moving.
//

/** One band, one lane, one run of events — the smallest thing the model can say. */
const oneLaneGroups: GanttGroup[] = [{ id: 'g' }];
const oneLaneLanes: GanttLane[] = [
  { id: 'l', label: 'One lane', status: 'done', groupId: 'g', segments: [{ start: T0, end: T0 + 8 * MINUTE }] },
];
const oneLaneMarkers: GanttMarker[] = events('l', 6, T0, T0 + 8 * MINUTE);

/**
 * One band, four lanes over different spans — including one worked in two stretches and one still
 * open. Segments are what makes the gap in the third lane sayable: a lane put down and picked back up
 * is two bars, not one long one.
 */
const manyLaneGroups: GanttGroup[] = [{ id: 'g' }];
const manyLaneLanes: GanttLane[] = [
  {
    id: 'early',
    label: 'Early and brief',
    status: 'done',
    groupId: 'g',
    segments: [{ start: T0, end: T0 + 3 * MINUTE }],
  },
  {
    id: 'long',
    label: 'Long, overlapping',
    status: 'done',
    groupId: 'g',
    segments: [{ start: T0 + 1 * MINUTE, end: T0 + 9 * MINUTE }],
  },
  {
    id: 'twice',
    label: 'Put down and picked up',
    status: 'review',
    groupId: 'g',
    segments: [
      { start: T0 + 2 * MINUTE, end: T0 + 4 * MINUTE },
      { start: T0 + 7 * MINUTE, end: T0 + 10 * MINUTE },
    ],
  },
  { id: 'open', label: 'Still running', status: 'running', groupId: 'g', segments: [{ start: T0 + 6 * MINUTE }] },
];
const manyLaneMarkers: GanttMarker[] = [
  ...events('early', 3, T0, T0 + 3 * MINUTE),
  ...events('long', 7, T0 + 1 * MINUTE, T0 + 9 * MINUTE),
  ...events('twice', 3, T0 + 2 * MINUTE, T0 + 4 * MINUTE, 'twice-a'),
  ...events('twice', 4, T0 + 7 * MINUTE, T0 + 10 * MINUTE, 'twice-b'),
  ...events('open', 4, T0 + 6 * MINUTE, T0 + 11 * MINUTE),
];

/**
 * One band whose lanes branch off one another, and answer back.
 *
 * Four facts about the same pairs of lanes, deliberately kept apart: `parentId` indents a branch
 * under the lane it belongs to, `openedFrom` draws the node it came out of, `closedInto` draws the
 * node its result landed on, and the segment says when it was actually worked. The sub-branch is
 * still working, so it has no return edge — which is the case that makes the separation earn itself.
 *
 * Handing work over and hearing back are separate events at separate instants, so no node does both:
 * a result gets a step of the axis to itself. A branch begins shortly *after* the node that opened it
 * and returns shortly after its own last event — a child's first event is its process starting, and a
 * supervisor folds a result in when it next runs, so neither is ever simultaneous with the node it
 * answers. That gap is also what gives every connector the same bent shape.
 */
const branchingGroups: GanttGroup[] = [{ id: 'g' }];
const branchingLanes: GanttLane[] = [
  { id: 'root', label: 'Root', status: 'done', groupId: 'g', segments: [{ start: T0, end: T0 + 10 * MINUTE }] },
  {
    id: 'first',
    label: 'Branch, returns',
    status: 'done',
    groupId: 'g',
    parentId: 'root',
    segments: [{ start: T0 + 2.2 * MINUTE, end: T0 + 3.5 * MINUTE }],
    openedFrom: { laneId: 'root', markerId: 'root:open-first' },
    closedInto: { laneId: 'root', markerId: 'root:return-first' },
  },
  {
    id: 'second',
    label: 'Branch, returns later',
    status: 'done',
    groupId: 'g',
    parentId: 'root',
    segments: [{ start: T0 + 5.2 * MINUTE, end: T0 + 8 * MINUTE }],
    openedFrom: { laneId: 'root', markerId: 'root:open-second' },
    closedInto: { laneId: 'root', markerId: 'root:return-second' },
  },
  {
    id: 'sub',
    label: 'Sub-branch, still working',
    status: 'running',
    groupId: 'g',
    parentId: 'second',
    segments: [{ start: T0 + 6.8 * MINUTE }],
    openedFrom: { laneId: 'second', markerId: 'second:1' },
  },
];

/** Written out rather than spread evenly: which node is a hand-over and which an answer is the point. */
const branchingMarkers: GanttMarker[] = [
  { id: 'root:0', laneId: 'root', kind: 'request', timestamp: T0, label: 'Request started' },
  {
    id: 'root:open-first',
    laneId: 'root',
    kind: 'delegation',
    timestamp: T0 + 2 * MINUTE,
    label: 'Opened first branch',
  },
  {
    id: 'root:return-first',
    laneId: 'root',
    kind: 'delegation',
    timestamp: T0 + 4 * MINUTE,
    label: 'Returned: first result',
  },
  {
    id: 'root:open-second',
    laneId: 'root',
    kind: 'delegation',
    timestamp: T0 + 5 * MINUTE,
    label: 'Opened second branch',
  },
  {
    id: 'root:return-second',
    laneId: 'root',
    kind: 'delegation',
    timestamp: T0 + 8.5 * MINUTE,
    label: 'Returned: second result',
  },
  { id: 'root:5', laneId: 'root', kind: 'request', timestamp: T0 + 10 * MINUTE, label: 'Request success' },

  ...events('first', 3, T0 + 2.2 * MINUTE, T0 + 3.5 * MINUTE),
  ...events('second', 3, T0 + 5.2 * MINUTE, T0 + 8 * MINUTE),
  ...events('sub', 3, T0 + 6.8 * MINUTE, T0 + 9.5 * MINUTE),
];

/**
 * Four bands: two nested under the first — each opening out of a node on its parent's lane — and one
 * unrelated band of its own. Nesting a band and opening a lane are separate statements, so the fourth
 * band sits beside the others without claiming any relation to them.
 *
 * The nested band that finished also answers back (`closedInto`, dashed); the one still running has
 * not, which is the point of keeping the two edges separate — a lane can be opened and never report.
 */
const manyGroupGroups: GanttGroup[] = [
  { id: 'one' },
  { id: 'one:a', parentId: 'one' },
  { id: 'one:b', parentId: 'one' },
  { id: 'two' },
];
const manyGroupLanes: GanttLane[] = [
  { id: 'p1', label: 'Group one', status: 'done', groupId: 'one', segments: [{ start: T0, end: T0 + 9 * MINUTE }] },
  {
    id: 'p1:task',
    label: 'Worked in-band',
    status: 'done',
    groupId: 'one',
    segments: [{ start: T0 + 0.6 * MINUTE, end: T0 + 2.5 * MINUTE }],
  },
  {
    id: 'p2',
    label: 'Nested band A',
    status: 'done',
    groupId: 'one:a',
    segments: [{ start: T0 + 3.2 * MINUTE, end: T0 + 5.6 * MINUTE }],
    openedFrom: { laneId: 'p1', markerId: 'p1:open-a' },
    closedInto: { laneId: 'p1', markerId: 'p1:return-a' },
  },
  {
    id: 'p2:task',
    label: 'Its own lane',
    status: 'done',
    groupId: 'one:a',
    segments: [{ start: T0 + 3.8 * MINUTE, end: T0 + 5.4 * MINUTE }],
  },
  {
    id: 'p3',
    label: 'Nested band B',
    status: 'running',
    groupId: 'one:b',
    segments: [{ start: T0 + 6.2 * MINUTE }],
    openedFrom: { laneId: 'p1', markerId: 'p1:open-b' },
  },
  {
    id: 'p4',
    label: 'Unrelated band',
    status: 'review',
    groupId: 'two',
    segments: [{ start: T0 + 1.5 * MINUTE, end: T0 + 7.5 * MINUTE }],
  },
];
const manyGroupMarkers: GanttMarker[] = [
  { id: 'p1:0', laneId: 'p1', kind: 'request', timestamp: T0, label: 'Request started' },
  { id: 'p1:open-a', laneId: 'p1', kind: 'delegation', timestamp: T0 + 3 * MINUTE, label: 'Opened band A' },
  { id: 'p1:open-b', laneId: 'p1', kind: 'delegation', timestamp: T0 + 6 * MINUTE, label: 'Opened band B' },
  { id: 'p1:return-a', laneId: 'p1', kind: 'delegation', timestamp: T0 + 7.2 * MINUTE, label: 'Returned: band A' },
  { id: 'p1:4', laneId: 'p1', kind: 'request', timestamp: T0 + 9 * MINUTE, label: 'Request success' },
  ...events('p1:task', 3, T0 + 0.6 * MINUTE, T0 + 2.5 * MINUTE),
  ...events('p2', 4, T0 + 3.2 * MINUTE, T0 + 5.6 * MINUTE),
  ...events('p2:task', 3, T0 + 3.8 * MINUTE, T0 + 5.4 * MINUTE),
  ...events('p3', 4, T0 + 6.2 * MINUTE, T0 + 10 * MINUTE),
  ...events('p4', 5, T0 + 1.5 * MINUTE, T0 + 7.5 * MINUTE),
];

/** One band, one lane, gaining an event a second — the fixture the live stories start from. */
const singleLaneGroups: GanttGroup[] = [{ id: 'g' }];
const singleLaneLanes: GanttLane[] = [
  {
    id: 'lane',
    label: 'Process — one event a second',
    status: 'running',
    groupId: 'g',
    segments: [{ start: T0 }],
  },
];
const singleLaneMarkers: GanttMarker[] = [
  { id: 'e:0', laneId: 'lane', kind: 'request', timestamp: T0, label: 'Request started' },
];

/** The same shape, named for what it does in the delegation story: hand work out and take it back. */
const supervisorLanes: GanttLane[] = [
  { id: 'lane', label: 'Supervisor', status: 'running', groupId: 'g', segments: [{ start: T0 }] },
];

/** The chart over the data it was drawn from, so a reader can match a bar to its lane. */
const Layout = ({ chart, data }: { chart: ReactNode; data: unknown }) => (
  <div className='flex flex-col dx-fill overflow-hidden'>
    {chart}
    <JsonHighlighter data={data} classNames='dx-grow border-t border-separator text-xs' />
  </div>
);

/** How many events a lane runs, and how many lanes each depth may open, when a story says neither. */
const CHILD_EVENTS: readonly [number, number] = [2, 5];
const MAX_SPAWNS: readonly number[] = [4, 3, 2];

/** Stable empty seeds: a fresh `[]` each render would retrigger the effect that adopts them. */
const NO_GROUPS: readonly GanttGroup[] = [];
const NO_LANES: readonly GanttLane[] = [];
const NO_MARKERS: readonly GanttMarker[] = [];

type EventStreamOptions = {
  /** How often an event arrives, in milliseconds. The stream is static without it. */
  interval?: number;
  /** The supervisor lane: what spawns the first children, and what they report back to. */
  laneId: string;
  /** How far each arrival advances the clock — the axis reads the instant, `interval` is real time. */
  step: number;
  /** The supervisor opens another child every so many arrivals. */
  spawnEvery?: number;
  /** How many events of its own a lane runs before it is finished, inclusive. */
  childEvents?: readonly [number, number];
  /** Percent chance a direct child delegates rather than works; halved at each level below it. */
  nestedChance?: number;
  /**
   * How many lanes may be opened at each depth, deepest last. This is what makes the run finite: the
   * budget is spent, everything in flight reports back, and the chart comes to rest — a demo that
   * grows for as long as it is left open never shows what finishing looks like.
   */
  maxSpawns?: readonly number[];
};

/** A lane still in flight: what it reports to, how far through its own work it is, and whether it has any left. */
type ActiveLane = {
  laneId: string;
  /** The lane that opened it, and the lane its result returns into. */
  parentId: string;
  depth: number;
  seen: number;
  budget: number;
  /** Out of work of its own, but holding children it has to hear back from first. */
  waiting: boolean;
};

type StreamState = {
  groups: GanttGroup[];
  lanes: GanttLane[];
  markers: GanttMarker[];
  active: ActiveLane[];
  /** Lanes opened so far at each depth, against `maxSpawns`. */
  opened: number[];
  /** Nothing left to hand out and nothing left in flight: the chart holds still from here. */
  complete: boolean;
  /** Which lane in flight gets the next event, so several progress at once rather than in turn. */
  turn: number;
  tick: number;
};

/**
 * The seed, plus one event every `interval` — the only moving part any of these stories has.
 *
 * The supervisor fans out: it opens a child every `spawnEvery` arrivals and keeps every one, so
 * several run at once. A child spends `childEvents` events and then reports back — except that it
 * may spend one of them delegating instead, less likely the deeper it already is, so the cascade
 * thins out rather than running away.
 *
 * A lane that has delegated does not report back until its own children have: it goes `blocked`
 * when its work runs out and finishes only once the last of them answers, which is the order the
 * results actually arrive in. Without that a parent would close before the children it is waiting
 * on, and its return edge would precede theirs.
 *
 * It returns the clock as well: on the time axis a chart cannot extend past `now`, so a live story
 * has to carry one, while the event axis makes its own room and ignores it.
 */
const useEventStream = (
  seedGroups: readonly GanttGroup[],
  seedLanes: readonly GanttLane[],
  seedMarkers: readonly GanttMarker[],
  {
    interval,
    laneId,
    step,
    spawnEvery,
    childEvents = CHILD_EVENTS,
    nestedChance = 30,
    maxSpawns = MAX_SPAWNS,
  }: EventStreamOptions,
): { groups: GanttGroup[]; lanes: GanttLane[]; markers: GanttMarker[]; now: number } => {
  const seed = (): StreamState => ({
    groups: [...seedGroups],
    lanes: [...seedLanes],
    markers: [...seedMarkers],
    active: [],
    opened: maxSpawns.map(() => 0),
    complete: false,
    turn: 0,
    tick: 0,
  });
  const [state, setState] = useState(seed);
  useEffect(() => {
    setState(seed());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedGroups, seedLanes, seedMarkers, laneId]);

  useEffect(() => {
    if (!interval) {
      return;
    }
    const [minEvents, maxEvents] = childEvents;
    const timer = setInterval(() => {
      setState(({ groups, lanes, markers, active, opened, complete, turn, tick }) => {
        if (complete) {
          return { groups, lanes, markers, active, opened, complete, turn, tick };
        }
        const base = Math.max(T0, ...markers.map((marker) => marker.timestamp));
        // Every marker a tick emits gets an instant of its own: a hand-over, the first event of what
        // it opened, and an answer are three events, and the axis counts events.
        let slot = 0;
        const next = (): number => base + ++slot * step;

        const nextGroups = [...groups];
        const nextLanes = [...lanes];
        const nextMarkers = [...markers];
        let nextActive = [...active];
        const nextOpened = [...opened];
        /** Depth is one-based, and a depth past the budget's length is past the deepest allowed. */
        const canOpen = (depth: number): boolean =>
          depth <= maxSpawns.length && nextOpened[depth - 1] < maxSpawns[depth - 1];

        const indexOf = (id: string): number => nextLanes.findIndex((lane) => lane.id === id);
        const patch = (id: string, change: Partial<GanttLane>): void => {
          const index = indexOf(id);
          if (index >= 0) {
            nextLanes[index] = { ...nextLanes[index], ...change };
          }
        };

        const open = (parentLaneId: string, depth: number): void => {
          const index = nextLanes.length;
          const child = `lane:${index}`;
          const band = `group:${index}`;
          const parentBand = nextLanes[indexOf(parentLaneId)]?.groupId;
          const spawn: GanttMarker = {
            id: `spawn:${child}`,
            laneId: parentLaneId,
            kind: 'delegation',
            timestamp: next(),
            label: `Opened ${child}`,
          };
          // A step after the spawn: a child's first event is its process starting, which is never
          // simultaneous with the node that asked for it.
          const start = next();
          nextGroups.push({ id: band, ...(parentBand ? { parentId: parentBand } : {}) });
          nextLanes.push({
            id: child,
            label: `Process ${index}`,
            status: 'running',
            groupId: band,
            segments: [{ start }],
            openedFrom: { laneId: parentLaneId, markerId: spawn.id },
          });
          nextMarkers.push(spawn, {
            id: `${child}:0`,
            laneId: child,
            kind: 'operation',
            timestamp: start,
            label: 'Run Instructions',
          });
          nextOpened[depth - 1] += 1;
          nextActive.push({
            laneId: child,
            parentId: parentLaneId,
            depth,
            seen: 1,
            budget: random.number.int({ min: minEvents, max: maxEvents }),
            waiting: false,
          });
        };

        const finish = (id: string, end: number): void => {
          const lane = nextActive.find((candidate) => candidate.laneId === id);
          if (!lane) {
            return;
          }
          const returned: GanttMarker = {
            id: `return:${id}`,
            laneId: lane.parentId,
            kind: 'delegation',
            timestamp: next(),
            label: `Returned: ${id}`,
          };
          nextMarkers.push(returned);
          patch(id, {
            status: 'done',
            segments: [{ start: nextLanes[indexOf(id)]?.segments?.[0]?.start ?? end, end }],
            closedInto: { laneId: lane.parentId, markerId: returned.id },
          });
          nextActive = nextActive.filter((candidate) => candidate.laneId !== id);
          // The parent may have been waiting on this one alone, in which case it can answer now too —
          // which is how a finished branch unwinds from the leaf up.
          const parent = nextActive.find((candidate) => candidate.laneId === lane.parentId);
          if (parent?.waiting && !nextActive.some((candidate) => candidate.parentId === parent.laneId)) {
            finish(parent.laneId, returned.timestamp);
          }
        };

        const settle = (done = false): StreamState => ({
          groups: nextGroups,
          lanes: nextLanes,
          markers: nextMarkers,
          active: nextActive,
          opened: nextOpened,
          complete: done,
          turn,
          tick: tick + 1,
        });

        if (spawnEvery && tick % spawnEvery === 0 && canOpen(1)) {
          open(laneId, 1);
          return settle();
        }

        // A lane that is only waiting has nothing to contribute; if every one of them is, the
        // supervisor fills the tick so the chart keeps moving.
        const working = nextActive.filter((candidate) => !candidate.waiting);
        if (working.length === 0) {
          // Everything handed out has reported back and there is nothing left to hand out: the
          // supervisor closes its own span, and the run is over.
          if (nextActive.length === 0 && !canOpen(1)) {
            const end = next();
            nextMarkers.push({ id: `live:${tick}`, laneId, kind: 'request', timestamp: end, label: 'Request success' });
            patch(laneId, {
              status: 'done',
              segments: [{ start: nextLanes[indexOf(laneId)]?.segments?.[0]?.start ?? end, end }],
            });
            return settle(true);
          }
          nextMarkers.push({
            id: `live:${tick}`,
            laneId,
            kind: 'tool',
            timestamp: next(),
            label: random.lorem.word(),
          });
          return settle();
        }

        const lane = working[turn % working.length];
        const seen = lane.seen + 1;
        // Halved at each level, so a child delegates readily and its own children rarely.
        const chance = Math.round(nestedChance / 2 ** (lane.depth - 1));
        const delegates = canOpen(lane.depth + 1) && random.number.int({ min: 1, max: 100 }) <= chance;
        if (delegates) {
          open(lane.laneId, lane.depth + 1);
        } else {
          nextMarkers.push({
            id: `${lane.laneId}:${seen}`,
            laneId: lane.laneId,
            kind: 'tool',
            timestamp: next(),
            label: random.lorem.word(),
          });
        }

        const end = nextMarkers[nextMarkers.length - 1].timestamp;
        nextActive = nextActive.map((candidate) =>
          candidate.laneId === lane.laneId ? { ...candidate, seen } : candidate,
        );
        if (seen >= lane.budget) {
          if (nextActive.some((candidate) => candidate.parentId === lane.laneId)) {
            nextActive = nextActive.map((candidate) =>
              candidate.laneId === lane.laneId ? { ...candidate, waiting: true } : candidate,
            );
            patch(lane.laneId, { status: 'blocked' });
          } else {
            finish(lane.laneId, end);
          }
        }
        return { ...settle(), turn: turn + 1 };
      });
    }, interval);
    return () => clearInterval(timer);
  }, [interval, step, spawnEvery, laneId, childEvents, nestedChance, maxSpawns]);

  return {
    groups: state.groups,
    lanes: state.lanes,
    markers: state.markers,
    now: Math.max(T0, ...state.markers.map((marker) => marker.timestamp)),
  };
};

type StoryArgs = GanttData &
  Partial<EventStreamOptions> & {
    /** Render the drawing alone, as a host that already lists the lanes does. */
    chartOnly?: boolean;
    /** Show the data the chart was drawn from beneath it. */
    inspect?: boolean;
  };

// Every stream option is destructured, not just the ones in use: what stays in `...data` is spread
// onto `Gantt.Root` and forwarded to a DOM element, so a missed one both fails to reach the stream
// and shows up as an unknown attribute.
const DefaultStory = ({
  chartOnly,
  inspect,
  interval,
  laneId = 'c',
  step = 0.5 * MINUTE,
  spawnEvery,
  childEvents,
  nestedChance,
  maxSpawns,
  ...data
}: StoryArgs) => {
  const stream = useEventStream(data.groups ?? NO_GROUPS, data.lanes ?? NO_LANES, data.markers ?? NO_MARKERS, {
    interval,
    laneId,
    step,
    spawnEvery,
    childEvents,
    nestedChance,
    maxSpawns,
  });
  // A live chart on the time axis has to be given room ahead of its newest event, and the range it
  // was handed ends before that event ever arrives; the event axis makes its own room.
  const live = interval !== undefined && data.axis !== 'event';
  const range = live && data.range ? { start: data.range.start, end: stream.now + step } : data.range;
  const now = live ? stream.now : data.now;

  const chart = (
    <Gantt.Root
      {...data}
      groups={stream.groups}
      lanes={stream.lanes}
      markers={stream.markers}
      range={range}
      now={now}
      classNames='p-4'
    >
      {!chartOnly && <Gantt.Legend />}
      <Gantt.Chart />
      {!chartOnly && <Gantt.Meta />}
    </Gantt.Root>
  );

  return inspect ? (
    <Layout chart={chart} data={{ groups: stream.groups, lanes: stream.lanes, markers: stream.markers, range, now }} />
  ) : (
    chart
  );
};

const meta = {
  title: 'ui/react-ui-trace/Gantt',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  args: {
    groups,
    lanes,
    markers,
    now: T0 + 10 * MINUTE,
    range: { start: T0, end: T0 + 11 * MINUTE },
    inspect: true,
    onLaneSelect: (lane: GanttLane) => console.log('lane', lane),
    onMarkerSelect: (marker: GanttMarker) => console.log('marker', marker),
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ChartOnly: Story = {
  args: {
    chartOnly: true,
  },
};

/** The time axis under a stream: every arrival widens the range, so the whole history shifts left. */
export const Live: Story = {
  args: {
    axis: 'time',
    interval: 1_000,
  },
};

/** The same run on the fitted axis, for contrast with {@link Live}: gaps argue for space by duration. */
export const TimeAxis: Story = {
  args: {
    axis: 'time',
  },
};

/** The primitives alone: one lane, one event a second, each opening out of the one before it. */
export const SingleLane: Story = {
  args: {
    groups: singleLaneGroups,
    lanes: singleLaneLanes,
    markers: singleLaneMarkers,
    axis: 'event',
    animate: true,
    interval: 1_000,
    laneId: 'lane',
    step: SECOND,
    range: undefined,
    now: undefined,
    inspect: false,
  },
};

/**
 * The supervisor fans out: every third arrival opens another child, and a child may delegate again
 * rather than work — less likely the deeper it already is. Each lane runs a handful of events,
 * reports back into a node of its own, and waits on anything it opened before it does.
 *
 * The run finishes: `maxSpawns` bounds how many lanes each depth may open, so the branches unwind
 * from the leaves up, the supervisor closes its own span, and the chart comes to rest.
 */
export const Delegation: Story = {
  args: {
    ...SingleLane.args,
    lanes: supervisorLanes,
    interval: 900,
    spawnEvery: 3,
    childEvents: [2, 5],
    nestedChance: 30,
    maxSpawns: [4, 3, 2],
  },
};

//
// Static: one shape of the model each, nothing moving.
//

/** One band, one lane, six events. */
export const OneLane: Story = {
  args: {
    groups: oneLaneGroups,
    lanes: oneLaneLanes,
    markers: oneLaneMarkers,
    axis: 'event',
    range: undefined,
    now: undefined,
  },
};

/** One band, four lanes over different spans — one worked twice, one still open. */
export const ManyLanes: Story = {
  args: {
    groups: manyLaneGroups,
    lanes: manyLaneLanes,
    markers: manyLaneMarkers,
    axis: 'event',
    range: undefined,
    now: undefined,
  },
};

/** One band whose lanes branch off one another: `parentId` indents, `openedFrom` and `closedInto` connect. */
export const Branching: Story = {
  args: {
    groups: branchingGroups,
    lanes: branchingLanes,
    markers: branchingMarkers,
    axis: 'event',
    range: undefined,
    now: undefined,
  },
};

/** Four bands: two nested under the first, one unrelated. */
export const ManyGroups: Story = {
  args: {
    groups: manyGroupGroups,
    lanes: manyGroupLanes,
    markers: manyGroupMarkers,
    axis: 'event',
    range: undefined,
    now: undefined,
  },
};
