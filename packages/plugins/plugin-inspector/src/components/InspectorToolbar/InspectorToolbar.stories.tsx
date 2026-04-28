//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Process } from '@dxos/functions-runtime';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type InspectorStep } from '#types';

import { translations } from '../../translations';
import { InspectorToolbar } from './InspectorToolbar';

const NOW = Date.parse('2026-04-28T12:00:00Z');

const SAMPLE_STEPS: InspectorStep[] = [
  {
    id: 'tool-1',
    timestamp: NOW,
    type: 'tool-call',
    label: 'decks.search',
    pending: false,
    toolName: 'decks.search',
    toolCallId: 'call-1',
  },
  {
    id: 'stats-1',
    timestamp: NOW + 1500,
    type: 'stats',
    label: 'Tokens',
    pending: false,
    tokens: { input: 1240, output: 312 },
    duration: 1500,
  },
];

const RUNNING_PROCESS: Process.Info = {
  id: 'agent-process-1',
  state: Process.State.RUNNING,
} as unknown as Process.Info;

const meta = {
  title: 'plugins/plugin-inspector/components/InspectorToolbar',
  component: InspectorToolbar,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof InspectorToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: { processes: [], steps: [] },
};

export const RunningWithMetrics: Story = {
  args: {
    processes: [RUNNING_PROCESS],
    steps: SAMPLE_STEPS,
    onStop: () => {},
    onClear: () => {},
  },
};

export const IdleWithHistory: Story = {
  args: {
    processes: [],
    steps: SAMPLE_STEPS,
    onClear: () => {},
  },
};
