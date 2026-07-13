//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { type Progress } from '@dxos/progress';
import { withTheme } from '@dxos/react-ui/testing';

import { ProgressMeter } from './ProgressMeter';

const meta = {
  title: 'sdk/app-toolkit/components/ProgressMeter',
  component: ProgressMeter,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ProgressMeter>;

export default meta;

type Story = StoryObj<typeof meta>;

const base = (overrides: Partial<Progress.TaskProgress>): Progress.TaskProgress => ({
  name: 'sync/mailbox',
  label: 'Syncing Inbox',
  current: 42,
  total: 120,
  status: 'running',
  startedAt: new Date(Date.now() - 8_000).toISOString(),
  updatedAt: new Date().toISOString(),
  elapsedMs: 8_000,
  ...overrides,
});

export const Determinate: Story = {
  args: {
    state: base({}),
    classNames: 'w-[240px]',
  },
};

export const Indeterminate: Story = {
  args: {
    state: base({ total: undefined }),
    classNames: 'w-[240px]',
  },
};

export const Error: Story = {
  args: {
    state: base({ status: 'error', error: 'Network unreachable' }),
    classNames: 'w-[240px]',
  },
};
