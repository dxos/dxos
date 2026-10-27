//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { type ProfileFact, type ProfileGoal, ProfileGraph } from './ProfileGraph.tsx';

const goals: ProfileGoal[] = [
  { id: 'goal-1', title: 'Launch autonomous agents', horizon: 'quarter', status: 'confirmed' },
  { id: 'goal-2', title: 'Hire two engineers', horizon: 'year', status: 'proposed' },
  { id: 'goal-3', title: 'Ship the Composer beta', horizon: 'now', status: 'achieved' },
];

const facts: ProfileFact[] = [
  {
    id: 'fact-1',
    text: 'Rich prefers daily standups',
    predicate: 'prefers',
    origin: 'stated',
    saidAt: '2026-10-02T10:30:00.000Z',
  },
  {
    id: 'fact-2',
    text: 'Rich member of Composer team',
    predicate: 'member of',
    origin: 'stated',
    saidAt: '2026-10-02T10:20:00.000Z',
  },
  {
    id: 'fact-3',
    text: 'Rich located in New York',
    predicate: 'located in',
    origin: 'inferred',
    saidAt: '2026-10-01T09:00:00.000Z',
  },
];

const meta = {
  title: 'plugins/plugin-agent/components/ProfileGraph',
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
  args: { goals, facts },
};

export const Empty: Story = {
  args: { goals: [], facts: [] },
};
