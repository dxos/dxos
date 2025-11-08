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
  argTypes: {
    animate: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof AnimatedBorder>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    classNames: 'border border-subduedSeparator',
    children: (
      <div className='pli-4 plb-2 text-center text-description'>
        <p>A light effect travels around the border.</p>
      </div>
    ),
  },
};
