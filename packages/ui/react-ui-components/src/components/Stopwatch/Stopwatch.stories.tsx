//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { Stopwatch } from './Stopwatch';

const meta = {
  title: 'ui/react-ui-components/Stopwatch',
  component: Stopwatch,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Stopwatch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMeta: Story = {
  args: {
    meta: (
      <>
        <span>↑ 234</span>
        <span aria-hidden='true' className='px-1 opacity-50'>
          ·
        </span>
        <span>↓ 1.2k</span>
      </>
    ),
  },
};

export const WithCustomIcon: Story = {
  args: {
    icon: (
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
    ),
  },
};

export const LongRunning: Story = {
  args: {
    // 65 minutes ago — exercises the `Xh Ym` tier without waiting.
    start: Date.now() - 65 * 60 * 1_000,
  },
};
