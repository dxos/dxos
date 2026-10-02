//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { type ProfileGoal, ProfileGraph, type ProfileMemory } from './ProfileGraph.tsx';

const goals: ProfileGoal[] = [
  { id: 'goal-1', title: 'Launch interlocutor agents', horizon: 'quarter', status: 'confirmed' },
  { id: 'goal-2', title: 'Hire two engineers', horizon: 'year', status: 'proposed' },
  { id: 'goal-3', title: 'Ship the Composer beta', horizon: 'now', status: 'achieved' },
];

const memories: ProfileMemory[] = [
  {
    id: 'memory-1',
    content: 'Rich prefers daily standups over written updates.',
    kind: 'preference',
    origin: 'stated',
    observedAt: '2026-10-02T10:30:00.000Z',
  },
  {
    id: 'memory-2',
    content: 'Rich leads the Composer team.',
    kind: 'relationship',
    origin: 'stated',
    observedAt: '2026-10-02T10:20:00.000Z',
  },
  {
    id: 'memory-3',
    content: 'Rich is based in New York.',
    kind: 'fact',
    origin: 'inferred',
    observedAt: '2026-10-01T09:00:00.000Z',
  },
];

const meta = {
  title: 'plugins/plugin-interlocutor/components/ProfileGraph',
  component: ProfileGraph,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ProfileGraph>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { goals, memories },
};

export const Empty: Story = {
  args: { goals: [], memories: [] },
};
