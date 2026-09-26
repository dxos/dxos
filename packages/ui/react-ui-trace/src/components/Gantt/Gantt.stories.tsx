//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode, useEffect, useState } from 'react';

import { random } from '@dxos/random';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Gantt, type GanttData, type GanttLane, type GanttMarker } from './Gantt.tsx';

random.seed(1);

const T0 = Date.UTC(2026, 8, 11, 10, 0, 0);
const MINUTE = 60_000;

/**
 * Process A works two tasks itself and spawns process B for a third, which in turn works two subtasks
 * in-session; process C is a second spawn from A. Two runs have terminated (one failed), the rest are
 * still going, and the last task waits on C.
 */
const lanes: GanttLane[] = [
  {
    id: 'a',
    kind: 'session',
    label: 'Process A — Plan the release',
    status: 'running',
    start: T0,
    tokens: { input: 12_400, output: 3_100, total: 15_500 },
    toolCalls: 6,
  },
  {
    id: 'a:triage',
    kind: 'task',
    taskId: 'task:triage',
    label: 'Triage open issues',
    status: 'done',
    parentId: 'a',
    start: T0 + 0.5 * MINUTE,
    end: T0 + 1.8 * MINUTE,
  },
  {
    id: 'a:docs',
    kind: 'task',
    taskId: 'task:docs',
    label: 'Update docs',
    status: 'failed',
    parentId: 'a',
    start: T0 + 2.4 * MINUTE,
    end: T0 + 3.6 * MINUTE,
  },
  {
    id: 'b',
    kind: 'session',
    taskId: 'task:changelog',
    label: 'Process B — Draft changelog',
    status: 'done',
    parentId: 'a',
    start: T0 + 4.1 * MINUTE,
    end: T0 + 7.2 * MINUTE,
    delegatedFrom: { laneId: 'a', markerId: 'm:a-spawn-b' },
    tokens: { input: 40_200, output: 8_900, total: 49_100 },
    toolCalls: 4,
  },
  {
    id: 'b:titles',
    kind: 'task',
    taskId: 'task:titles',
    label: 'Collect PR titles',
    status: 'done',
    parentId: 'b',
    start: T0 + 4.6 * MINUTE,
    end: T0 + 5.7 * MINUTE,
  },
  {
    id: 'b:highlights',
    kind: 'task',
    taskId: 'task:highlights',
    label: 'Write highlights',
    status: 'done',
    parentId: 'b',
    start: T0 + 6 * MINUTE,
    end: T0 + 6.9 * MINUTE,
  },
  {
    id: 'c',
    kind: 'session',
    taskId: 'task:notes',
    label: 'Process C — Write release notes',
    status: 'running',
    parentId: 'a',
    start: T0 + 5.1 * MINUTE,
    delegatedFrom: { laneId: 'a', markerId: 'm:a-spawn-c' },
    tokens: { input: 8_000, output: 900, total: 8_900 },
    toolCalls: 2,
  },
  {
    id: 'a:announce',
    kind: 'task',
    taskId: 'task:announce',
    label: 'Publish announcement',
    status: 'blocked',
    parentId: 'a',
    blockedOn: ['c'],
  },
];

const markers: GanttMarker[] = [
  { id: 'm:a-begin', laneId: 'a', kind: 'request', timestamp: T0, label: 'Request started' },
  { id: 'm:a-user', laneId: 'a', kind: 'message', timestamp: T0 + 0.2 * MINUTE, label: 'Plan the release' },
  { id: 'm:a-spawn-b', laneId: 'a', kind: 'delegation', timestamp: T0 + 4 * MINUTE, label: 'Spawned process B' },
  { id: 'm:a-spawn-c', laneId: 'a', kind: 'delegation', timestamp: T0 + 5 * MINUTE, label: 'Spawned process C' },
  { id: 'm:a-end', laneId: 'a', kind: 'request', timestamp: T0 + 5.4 * MINUTE, label: 'Request success' },

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

/** The chart over the data it was drawn from, so a reader can match a bar to its lane. */
const Layout = ({ chart, data }: { chart: ReactNode; data: unknown }) => (
  <div className='flex flex-col dx-fill overflow-hidden'>
    {chart}
    <JsonHighlighter data={data} classNames='dx-grow border-t border-separator text-xs' />
  </div>
);

/** One lane whose whole history is the stream: what the axis and the animation are for, alone. */
const singleLane: GanttLane[] = [
  { id: 'lane', kind: 'session', label: 'Process — one event a second', status: 'running', start: T0 },
];

const singleLaneMarkers: GanttMarker[] = [
  { id: 'e:0', laneId: 'lane', kind: 'request', timestamp: T0, label: 'Request started' },
];

/** A stable empty seed: a fresh `[]` each render would retrigger the effect that adopts it. */
const NO_MARKERS: readonly GanttMarker[] = [];

type EventStreamOptions = {
  /** How often an event arrives, in milliseconds. The stream is static without it. */
  interval?: number;
  /** The lane arrivals land on. */
  laneId: string;
  /** How far each arrival advances the clock — the axis reads the instant, `interval` is real time. */
  step: number;
};

/**
 * The seed markers, plus one more every `interval` — the only moving part any of these stories has.
 *
 * It returns the clock as well: on the time axis a chart cannot extend past `now`, so a live story
 * has to carry one, while the event axis makes its own room and ignores it.
 */
const useEventStream = (
  seed: readonly GanttMarker[],
  { interval, laneId, step }: EventStreamOptions,
): { markers: GanttMarker[]; now: number } => {
  const [markers, setMarkers] = useState<GanttMarker[]>(() => [...seed]);
  useEffect(() => {
    setMarkers([...seed]);
  }, [seed]);
  useEffect(() => {
    if (!interval) {
      return;
    }
    const timer = setInterval(() => {
      setMarkers((markers) => [
        ...markers,
        {
          id: `live:${markers.length}`,
          laneId,
          kind: 'tool',
          timestamp: Math.max(T0, ...markers.map((marker) => marker.timestamp)) + step,
          label: random.lorem.word(),
        },
      ]);
    }, interval);
    return () => clearInterval(timer);
  }, [interval, laneId, step]);

  return { markers, now: Math.max(T0, ...markers.map((marker) => marker.timestamp)) };
};

type StoryArgs = GanttData &
  Partial<EventStreamOptions> & {
    /** Render the drawing alone, as a host that already lists the lanes does. */
    chartOnly?: boolean;
    /** Show the data the chart was drawn from beneath it. */
    inspect?: boolean;
  };

const DefaultStory = ({ chartOnly, inspect, interval, laneId = 'c', step = 0.5 * MINUTE, ...data }: StoryArgs) => {
  const stream = useEventStream(data.markers ?? NO_MARKERS, { interval, laneId, step });
  // A live chart on the time axis has to be given room ahead of its newest event, and the range it
  // was handed ends before that event ever arrives; the event axis makes its own room.
  const live = interval !== undefined && data.axis !== 'event';
  const range = live && data.range ? { start: data.range.start, end: stream.now + step } : data.range;
  const now = live ? stream.now : data.now;

  const chart = (
    <Gantt.Root {...data} markers={stream.markers} range={range} now={now} classNames='p-4'>
      {!chartOnly && <Gantt.Legend />}
      <Gantt.Chart />
      {!chartOnly && <Gantt.Meta />}
    </Gantt.Root>
  );

  return inspect ? <Layout chart={chart} data={{ lanes: data.lanes, markers: stream.markers, range, now }} /> : chart;
};

const meta = {
  title: 'ui/react-ui-trace/Gantt',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  args: {
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
    lanes: singleLane,
    markers: singleLaneMarkers,
    axis: 'event',
    animate: true,
    interval: 1_000,
    laneId: 'lane',
    step: 1_000,
    range: undefined,
    now: undefined,
    inspect: false,
  },
};
