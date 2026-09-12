//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode, useEffect, useState } from 'react';

import { random } from '@dxos/random';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
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
    <Syntax.Root data={data}>
      <Syntax.Content classNames='dx-grow border-t border-separator'>
        <Syntax.Viewport>
          <Syntax.Code classNames='text-xs' />
        </Syntax.Viewport>
      </Syntax.Content>
    </Syntax.Root>
  </div>
);

type StoryArgs = GanttData & {
  /** Render the drawing alone, as a host that already lists the lanes does. */
  chartOnly?: boolean;
};

const Chart = ({ chartOnly, ...data }: StoryArgs) => (
  <Gantt.Root {...data} classNames='p-4'>
    {!chartOnly && <Gantt.Legend />}
    <Gantt.Chart />
    {!chartOnly && <Gantt.Meta />}
  </Gantt.Root>
);

const DefaultStory = (props: StoryArgs) => (
  <Layout
    chart={<Chart {...props} />}
    data={{ lanes: props.lanes, markers: props.markers, range: props.range, now: props.now }}
  />
);

/** Appends a tool marker to the running sub-agent every tick, so its box grows with `now`. */
const LiveStory = (props: StoryArgs) => {
  const [now, setNow] = useState(T0 + 10 * MINUTE);
  const [live, setLive] = useState<GanttMarker[]>([...(props.markers ?? [])]);
  useEffect(() => {
    const interval = setInterval(() => {
      setNow((now) => {
        const next = now + 0.5 * MINUTE;
        setLive((markers) => [
          ...markers,
          {
            id: `m:live-${markers.length}`,
            laneId: 'c',
            kind: 'tool',
            timestamp: next,
            label: random.lorem.word(),
          },
        ]);
        return next;
      });
    }, 1_000);
    return () => clearInterval(interval);
  }, []);
  const range = { start: T0, end: now + MINUTE };
  return (
    <Layout
      chart={<Chart {...props} markers={live} now={now} range={range} />}
      data={{ lanes: props.lanes, markers: live, range, now }}
    />
  );
};

const meta = {
  title: 'ui/react-ui-components/Gantt',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  args: {
    lanes,
    markers,
    now: T0 + 10 * MINUTE,
    range: { start: T0, end: T0 + 11 * MINUTE },
    onLaneSelect: (lane: GanttLane) => console.log('lane', lane),
    onMarkerSelect: (marker: GanttMarker) => console.log('marker', marker),
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ChartOnly: Story = {
  args: { chartOnly: true },
};

export const Live: Story = {
  render: LiveStory,
};
