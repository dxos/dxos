//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { random } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Gantt, type GanttLane, type GanttMarker, type GanttProps } from './Gantt.tsx';

random.seed(1);

const T0 = Date.UTC(2026, 8, 11, 10, 0, 0);
const MINUTE = 60_000;

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
    id: 'task:1',
    kind: 'task',
    label: 'Draft changelog',
    status: 'done',
    parentId: 'supervisor',
    start: T0 + 2 * MINUTE,
    end: T0 + 9 * MINUTE,
  },
  {
    id: 'session:1',
    kind: 'session',
    label: 'Draft changelog',
    status: 'done',
    parentId: 'supervisor',
    start: T0 + 2 * MINUTE,
    end: T0 + 9 * MINUTE,
    delegatedFrom: { laneId: 'supervisor', markerId: 'm:spawn-1' },
    tokens: { input: 40_200, output: 8_900, total: 49_100 },
    toolCalls: 4,
  },
  {
    id: 'task:2',
    kind: 'task',
    label: 'Write release notes',
    status: 'running',
    parentId: 'supervisor',
    start: T0 + 4 * MINUTE,
  },
  {
    id: 'session:2',
    kind: 'session',
    label: 'Write release notes',
    status: 'running',
    parentId: 'supervisor',
    start: T0 + 4 * MINUTE,
    delegatedFrom: { laneId: 'supervisor', markerId: 'm:spawn-2' },
    tokens: { input: 8_000, output: 900, total: 8_900 },
    toolCalls: 1,
  },
  {
    id: 'task:3',
    kind: 'task',
    label: 'Publish announcement',
    status: 'blocked',
    parentId: 'supervisor',
    blockedOn: ['task:2'],
  },
];

const markers: GanttMarker[] = [
  { id: 'm:begin', laneId: 'supervisor', kind: 'request', timestamp: T0, label: 'Request started' },
  { id: 'm:user', laneId: 'supervisor', kind: 'message', timestamp: T0 + 0.2 * MINUTE, label: 'Plan the release' },
  { id: 'm:tool-1', laneId: 'supervisor', kind: 'tool', timestamp: T0 + 1.5 * MINUTE, label: 'update-tasks' },
  { id: 'm:spawn-1', laneId: 'supervisor', kind: 'delegation', timestamp: T0 + 2 * MINUTE, label: 'Delegated' },
  { id: 'm:spawn-2', laneId: 'supervisor', kind: 'delegation', timestamp: T0 + 4 * MINUTE, label: 'Delegated' },
  { id: 'm:end', laneId: 'supervisor', kind: 'request', timestamp: T0 + 4.5 * MINUTE, label: 'Request success' },
  { id: 'm:s1-start', laneId: 'session:1', kind: 'operation', timestamp: T0 + 2 * MINUTE, label: 'Run Instructions' },
  { id: 'm:s1-tool', laneId: 'session:1', kind: 'tool', timestamp: T0 + 5 * MINUTE, label: 'create-document' },
  {
    id: 'm:s1-fail',
    laneId: 'session:1',
    kind: 'operation',
    timestamp: T0 + 7 * MINUTE,
    label: 'Add artifact',
    level: 'error',
  },
  { id: 'm:s1-end', laneId: 'session:1', kind: 'operation', timestamp: T0 + 9 * MINUTE, label: 'Run Instructions' },
  { id: 'm:s2-start', laneId: 'session:2', kind: 'operation', timestamp: T0 + 4 * MINUTE, label: 'Run Instructions' },
  { id: 'm:s2-tool', laneId: 'session:2', kind: 'tool', timestamp: T0 + 6 * MINUTE, label: 'search' },
];

const DefaultStory = (props: GanttProps) => <Gantt {...props} classNames='m-4' />;

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
            laneId: 'session:2',
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
  return <Gantt {...props} markers={live} now={now} range={{ start: T0, end: now + MINUTE }} classNames='m-4' />;
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
