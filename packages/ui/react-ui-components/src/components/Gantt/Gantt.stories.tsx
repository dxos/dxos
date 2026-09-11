//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode, useEffect, useState } from 'react';

import { random } from '@dxos/random';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Gantt, type GanttLane, type GanttMarker, type GanttProps } from './Gantt.tsx';

random.seed(1);

const T0 = Date.UTC(2026, 8, 11, 10, 0, 0);
const MINUTE = 60_000;

/**
 * One session per task, every one spawned from a node on its parent: the supervisor delegates three
 * tasks, one of which delegates two subtasks of its own; two runs have terminated (one failed), two
 * are still running, and the last waits on a running one.
 */
const lanes: GanttLane[] = [
  {
    id: 'supervisor',
    kind: 'session',
    label: 'Plan the release',
    status: 'running',
    start: T0,
    tokens: { input: 12_400, output: 3_100, total: 15_500 },
    toolCalls: 6,
  },
  {
    id: 'changelog',
    kind: 'session',
    taskId: 'task:changelog',
    label: 'Draft changelog',
    status: 'done',
    parentId: 'supervisor',
    start: T0 + 2.1 * MINUTE,
    end: T0 + 6.2 * MINUTE,
    delegatedFrom: { laneId: 'supervisor', markerId: 'm:spawn-changelog' },
    tokens: { input: 40_200, output: 8_900, total: 49_100 },
    toolCalls: 4,
  },
  {
    id: 'docs',
    kind: 'session',
    taskId: 'task:docs',
    label: 'Update docs',
    status: 'failed',
    parentId: 'supervisor',
    start: T0 + 3.1 * MINUTE,
    end: T0 + 5.3 * MINUTE,
    delegatedFrom: { laneId: 'supervisor', markerId: 'm:spawn-docs' },
    tokens: { input: 6_100, output: 400, total: 6_500 },
    toolCalls: 2,
  },
  {
    id: 'notes',
    kind: 'session',
    taskId: 'task:notes',
    label: 'Write release notes',
    status: 'running',
    parentId: 'supervisor',
    start: T0 + 4.2 * MINUTE,
    delegatedFrom: { laneId: 'supervisor', markerId: 'm:spawn-notes' },
    tokens: { input: 8_000, output: 900, total: 8_900 },
    toolCalls: 3,
  },
  {
    id: 'notes:titles',
    kind: 'session',
    taskId: 'task:notes:titles',
    label: 'Collect PR titles',
    status: 'done',
    parentId: 'notes',
    start: T0 + 5.1 * MINUTE,
    end: T0 + 7 * MINUTE,
    delegatedFrom: { laneId: 'notes', markerId: 'm:notes-spawn-titles' },
    tokens: { input: 3_200, output: 600, total: 3_800 },
    toolCalls: 2,
  },
  {
    id: 'notes:breaking',
    kind: 'session',
    taskId: 'task:notes:breaking',
    label: 'Summarize breaking changes',
    status: 'running',
    parentId: 'notes',
    start: T0 + 6.3 * MINUTE,
    delegatedFrom: { laneId: 'notes', markerId: 'm:notes-spawn-breaking' },
    tokens: { input: 2_400, output: 300, total: 2_700 },
    toolCalls: 1,
  },
  {
    id: 'announce',
    kind: 'task',
    taskId: 'task:announce',
    label: 'Publish announcement',
    status: 'blocked',
    parentId: 'supervisor',
    blockedOn: ['notes'],
  },
];

const markers: GanttMarker[] = [
  { id: 'm:begin', laneId: 'supervisor', kind: 'request', timestamp: T0, label: 'Request started' },
  { id: 'm:user', laneId: 'supervisor', kind: 'message', timestamp: T0 + 0.2 * MINUTE, label: 'Plan the release' },
  { id: 'm:tool-1', laneId: 'supervisor', kind: 'tool', timestamp: T0 + 1.5 * MINUTE, label: 'update-tasks' },
  { id: 'm:spawn-changelog', laneId: 'supervisor', kind: 'delegation', timestamp: T0 + 2 * MINUTE, label: 'Delegated' },
  { id: 'm:spawn-docs', laneId: 'supervisor', kind: 'delegation', timestamp: T0 + 3 * MINUTE, label: 'Delegated' },
  { id: 'm:spawn-notes', laneId: 'supervisor', kind: 'delegation', timestamp: T0 + 4 * MINUTE, label: 'Delegated' },
  { id: 'm:end', laneId: 'supervisor', kind: 'request', timestamp: T0 + 4.5 * MINUTE, label: 'Request success' },

  {
    id: 'm:changelog-start',
    laneId: 'changelog',
    kind: 'operation',
    timestamp: T0 + 2.1 * MINUTE,
    label: 'Run Instructions',
  },
  { id: 'm:changelog-tool', laneId: 'changelog', kind: 'tool', timestamp: T0 + 3.5 * MINUTE, label: 'create-document' },
  {
    id: 'm:changelog-end',
    laneId: 'changelog',
    kind: 'operation',
    timestamp: T0 + 6.2 * MINUTE,
    label: 'Run Instructions',
  },

  { id: 'm:docs-start', laneId: 'docs', kind: 'operation', timestamp: T0 + 3.1 * MINUTE, label: 'Run Instructions' },
  { id: 'm:docs-tool', laneId: 'docs', kind: 'tool', timestamp: T0 + 4.1 * MINUTE, label: 'search' },
  {
    id: 'm:docs-fail',
    laneId: 'docs',
    kind: 'error',
    timestamp: T0 + 5.3 * MINUTE,
    label: 'Add artifact',
    level: 'error',
  },

  { id: 'm:notes-start', laneId: 'notes', kind: 'operation', timestamp: T0 + 4.2 * MINUTE, label: 'Run Instructions' },
  { id: 'm:notes-spawn-titles', laneId: 'notes', kind: 'delegation', timestamp: T0 + 5 * MINUTE, label: 'Delegated' },
  { id: 'm:notes-spawn-breaking', laneId: 'notes', kind: 'delegation', timestamp: T0 + 6 * MINUTE, label: 'Delegated' },
  { id: 'm:notes-tool', laneId: 'notes', kind: 'tool', timestamp: T0 + 8 * MINUTE, label: 'create-document' },

  {
    id: 'm:titles-start',
    laneId: 'notes:titles',
    kind: 'operation',
    timestamp: T0 + 5.1 * MINUTE,
    label: 'Run Instructions',
  },
  {
    id: 'm:titles-tool',
    laneId: 'notes:titles',
    kind: 'tool',
    timestamp: T0 + 6.1 * MINUTE,
    label: 'list-pull-requests',
  },
  {
    id: 'm:titles-end',
    laneId: 'notes:titles',
    kind: 'operation',
    timestamp: T0 + 7 * MINUTE,
    label: 'Run Instructions',
  },

  {
    id: 'm:breaking-start',
    laneId: 'notes:breaking',
    kind: 'operation',
    timestamp: T0 + 6.3 * MINUTE,
    label: 'Run Instructions',
  },
  { id: 'm:breaking-tool', laneId: 'notes:breaking', kind: 'tool', timestamp: T0 + 7.5 * MINUTE, label: 'search' },
];

/** The chart over the data it was drawn from, so a reader can match a bar to its lane. */
const Layout = ({ chart, data }: { chart: ReactNode; data: unknown }) => (
  <div className='flex flex-col w-full h-full overflow-hidden'>
    {chart}
    <Syntax.Root data={data}>
      <Syntax.Content classNames='min-h-0 flex-1 border-t border-separator'>
        <Syntax.Viewport>
          <Syntax.Code classNames='text-xs' />
        </Syntax.Viewport>
      </Syntax.Content>
    </Syntax.Root>
  </div>
);

const DefaultStory = (props: GanttProps) => (
  <Layout
    chart={<Gantt {...props} classNames='p-4' />}
    data={{ lanes: props.lanes, markers: props.markers, range: props.range, now: props.now }}
  />
);

/** Appends a tool marker to the running sub-agent every tick, so its box grows with `now`. */
const LiveStory = (props: GanttProps) => {
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
            laneId: 'notes:breaking',
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
      chart={<Gantt {...props} markers={live} now={now} range={range} classNames='p-4' />}
      data={{ lanes: props.lanes, markers: live, range, now }}
    />
  );
};

const meta = {
  title: 'ui/react-ui-components/Gantt',
  component: Gantt,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  args: {
    lanes,
    markers,
    now: T0 + 10 * MINUTE,
    range: { start: T0, end: T0 + 11 * MINUTE },
    onLaneSelect: (lane) => console.log('lane', lane),
    onMarkerSelect: (marker) => console.log('marker', marker),
  },
} satisfies Meta<typeof Gantt>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Live: Story = {
  render: LiveStory,
};
