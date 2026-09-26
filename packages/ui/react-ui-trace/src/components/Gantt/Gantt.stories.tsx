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
 * Each branch begins exactly at the node that opened it, because a lane cannot start before its own
 * cause; and each returns at a *later* node than its own end, because the supervisor folds a result
 * in when it next runs, not the instant the child stops.
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
    segments: [{ start: T0 + 2 * MINUTE, end: T0 + 3.5 * MINUTE }],
    openedFrom: { laneId: 'root', markerId: 'root:1' },
    closedInto: { laneId: 'root', markerId: 'root:2' },
  },
  {
    id: 'second',
    label: 'Branch, returns later',
    status: 'done',
    groupId: 'g',
    parentId: 'root',
    segments: [{ start: T0 + 4 * MINUTE, end: T0 + 7 * MINUTE }],
    openedFrom: { laneId: 'root', markerId: 'root:2' },
    closedInto: { laneId: 'root', markerId: 'root:4' },
  },
  {
    id: 'sub',
    label: 'Sub-branch, still working',
    status: 'running',
    groupId: 'g',
    parentId: 'second',
    segments: [{ start: T0 + 5.5 * MINUTE }],
    openedFrom: { laneId: 'second', markerId: 'second:1' },
  },
];
const branchingMarkers: GanttMarker[] = [
  ...events('root', 6, T0, T0 + 10 * MINUTE),
  ...events('first', 3, T0 + 2 * MINUTE, T0 + 3.5 * MINUTE),
  ...events('second', 3, T0 + 4 * MINUTE, T0 + 7 * MINUTE),
  ...events('sub', 3, T0 + 5.5 * MINUTE, T0 + 9.5 * MINUTE),
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
    segments: [{ start: T0 + 3.2 * MINUTE, end: T0 + 6 * MINUTE }],
    openedFrom: { laneId: 'p1', markerId: 'p1:1' },
    closedInto: { laneId: 'p1', markerId: 'p1:2' },
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
    openedFrom: { laneId: 'p1', markerId: 'p1:2' },
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
  ...events('p1', 4, T0, T0 + 9 * MINUTE),
  ...events('p1:task', 3, T0 + 0.6 * MINUTE, T0 + 2.5 * MINUTE),
  ...events('p2', 4, T0 + 3.2 * MINUTE, T0 + 6 * MINUTE),
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

/** The chart over the data it was drawn from, so a reader can match a bar to its lane. */
const Layout = ({ chart, data }: { chart: ReactNode; data: unknown }) => (
  <div className='flex flex-col dx-fill overflow-hidden'>
    {chart}
    <JsonHighlighter data={data} classNames='dx-grow border-t border-separator text-xs' />
  </div>
);

/** Stable empty seeds: a fresh `[]` each render would retrigger the effect that adopts them. */
const NO_GROUPS: readonly GanttGroup[] = [];
const NO_LANES: readonly GanttLane[] = [];
const NO_MARKERS: readonly GanttMarker[] = [];

type EventStreamOptions = {
  /** How often an event arrives, in milliseconds. The stream is static without it. */
  interval?: number;
  /** The lane arrivals land on, until one opens a new band. */
  laneId: string;
  /** How far each arrival advances the clock — the axis reads the instant, `interval` is real time. */
  step: number;
  /** Open a new band, out of the lane in hand, every so many arrivals. */
  spawnEvery?: number;
};

/**
 * The seed, plus one event every `interval` — the only moving part any of these stories has. With
 * `spawnEvery` an arrival opens a band instead: a new group and lane, and the events after it land
 * there.
 *
 * It returns the clock as well: on the time axis a chart cannot extend past `now`, so a live story
 * has to carry one, while the event axis makes its own room and ignores it.
 */
const useEventStream = (
  seedGroups: readonly GanttGroup[],
  seedLanes: readonly GanttLane[],
  seedMarkers: readonly GanttMarker[],
  { interval, laneId, step, spawnEvery }: EventStreamOptions,
): { groups: GanttGroup[]; lanes: GanttLane[]; markers: GanttMarker[]; now: number } => {
  const seed = () => ({
    groups: [...seedGroups],
    lanes: [...seedLanes],
    markers: [...seedMarkers],
    current: laneId,
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
    const timer = setInterval(() => {
      setState(({ groups, lanes, markers, current }) => {
        const count = markers.length;
        const timestamp = Math.max(T0, ...markers.map((marker) => marker.timestamp)) + step;
        if (!spawnEvery || count % spawnEvery !== 0) {
          const event: GanttMarker = {
            id: `live:${count}`,
            laneId: current,
            kind: 'tool',
            timestamp,
            label: random.lorem.word(),
          };
          return { groups, lanes, markers: [...markers, event], current };
        }

        const child = `lane:${lanes.length}`;
        const band = `group:${lanes.length}`;
        const parentBand = lanes.find((lane) => lane.id === current)?.groupId;
        const spawn: GanttMarker = {
          id: `spawn:${count}`,
          laneId: current,
          kind: 'delegation',
          timestamp,
          label: `Opened ${child}`,
        };
        return {
          groups: [...groups, { id: band, ...(parentBand ? { parentId: parentBand } : {}) }],
          lanes: [
            // A lane that has opened another is waiting on it, not working: it stops being the lane
            // with a live edge, which is the whole point of marking one.
            ...lanes.map((lane) => (lane.id === current ? { ...lane, status: 'blocked' as const } : lane)),
            {
              id: child,
              label: `Process ${lanes.length}`,
              status: 'running' as const,
              groupId: band,
              segments: [{ start: timestamp }],
              openedFrom: { laneId: current, markerId: spawn.id },
            },
          ],
          markers: [
            ...markers,
            spawn,
            { id: `${child}:first`, laneId: child, kind: 'operation', timestamp, label: 'Run Instructions' },
          ],
          current: child,
        };
      });
    }, interval);
    return () => clearInterval(timer);
  }, [interval, step, spawnEvery]);

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

const DefaultStory = ({
  chartOnly,
  inspect,
  interval,
  laneId = 'c',
  step = 0.5 * MINUTE,
  spawnEvery,
  ...data
}: StoryArgs) => {
  const stream = useEventStream(data.groups ?? NO_GROUPS, data.lanes ?? NO_LANES, data.markers ?? NO_MARKERS, {
    interval,
    laneId,
    step,
    spawnEvery,
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
    interval: 1_000,
  },
};

/** The same run measured in events rather than seconds: every gap is one step, whatever it lasted. */
export const EventAxis: Story = {
  args: {
    axis: 'event',
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

/** Every fourth event opens a band: its connector draws out of the lane that opened it. */
export const Delegation: Story = {
  args: {
    ...SingleLane.args,
    interval: 1_500,
    spawnEvery: 4,
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
