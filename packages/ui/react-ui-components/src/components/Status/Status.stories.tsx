//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { Status } from './Status';

const meta = {
  title: 'ui/react-ui-components/Status',
  component: Status.Root,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Status.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Status.Root>
      <Status.Icon />
      <Status.Stopwatch />
    </Status.Root>
  ),
};

export const WithMeta: Story = {
  render: () => (
    <Status.Root>
      <Status.Icon />
      <Status.Stopwatch />
      <Status.Separator />
      <Status.Text>↑ 234</Status.Text>
      <Status.Separator />
      <Status.Text>↓ 1.2k</Status.Text>
    </Status.Root>
  ),
};

export const WithCustomIcon: Story = {
  render: () => (
    <Status.Root>
      <Status.Icon>
        <svg
          aria-hidden='true'
          viewBox='0 0 24 24'
          className='size-3.5 animate-spin-slow'
          fill='none'
          stroke='currentColor'
          strokeWidth={2}
        >
          <circle cx={12} cy={12} r={10} strokeOpacity={0.25} />
          <path d='M22 12a10 10 0 0 0-10-10' strokeLinecap='round' />
        </svg>
      </Status.Icon>
      <Status.Stopwatch />
    </Status.Root>
  ),
};

export const LongRunning: Story = {
  render: () => (
    <Status.Root>
      <Status.Icon />
      <Status.Stopwatch start={Date.now() - 65 * 60 * 1_000} />
      <Status.Separator />
      <Status.Text>↑ 4.5k</Status.Text>
      <Status.Separator />
      <Status.Text>↓ 12.3k</Status.Text>
    </Status.Root>
  ),
};

export const TextOnly: Story = {
  render: () => (
    <Status.Root>
      <Status.Icon />
      <Status.Text>Connecting…</Status.Text>
    </Status.Root>
  ),
};
