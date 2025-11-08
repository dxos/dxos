//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { AnimatedBorder } from './AnimatedBorder';

const meta = {
  title: 'ui/react-ui-components/AnimatedBorder',
  component: AnimatedBorder,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof AnimatedBorder>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className='pli-8 plb-4 text-center'>
        <h3 className='text-lg font-semibold mb-2'>Animated Border</h3>
        <p className='text-neutral-600 dark:text-neutral-400'>A light effect travels around the border.</p>
      </div>
    ),
  },
};
