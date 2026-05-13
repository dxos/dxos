//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { Shimmer } from './Shimmer';

const meta = {
  title: 'ui/react-ui-components/Shimmer',
  component: Shimmer,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Shimmer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Thinking…',
  },
};

/**
 * Demonstrates the default truncate behavior — long text in a constrained parent
 * stays on a single line and ellipsizes rather than wrapping.
 */
export const LongText: Story = {
  decorators: [
    (Story) => (
      <div className='w-[20rem] border border-separator p-2'>
        <Story />
      </div>
    ),
  ],
  args: {
    children:
      'Establishing a secure peer connection, exchanging schemas, and reconciling the object graph before the next frame.',
  },
};

export const WithCustomColor: Story = {
  args: {
    classNames: 'text-sky-600 dark:text-sky-400 text-lg',
    children: 'Color is preserved through the mask',
  },
};

/**
 * Inspects the dimmed fallback without changing OS settings — the decorator
 * unconditionally applies the same declarations the production CSS uses
 * inside `@media (prefers-reduced-motion: reduce)`. The `force-reduced-motion`
 * class is local to this story and does NOT exist anywhere else in the codebase.
 */
export const ReducedMotion: Story = {
  decorators: [
    (Story) => (
      <>
        <style>
          {`.force-reduced-motion .shimmer-text {
              animation: none;
              mask-image: none;
              -webkit-mask-image: none;
              opacity: 0.6;
            }`}
        </style>
        <div className='force-reduced-motion'>
          <Story />
        </div>
      </>
    ),
  ],
  args: {
    children: 'Reduced motion fallback',
  },
};
