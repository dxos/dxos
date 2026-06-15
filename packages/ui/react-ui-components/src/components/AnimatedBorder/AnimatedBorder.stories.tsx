//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { AnimatedBorder } from './AnimatedBorder';

const meta = {
  title: 'ui/react-ui-components/AnimatedBorder',
  component: AnimatedBorder,
  argTypes: {
    animate: {
      control: 'boolean',
    },
  },
  decorators: [withTheme(), withLayout({ layout: 'column', scroll: true })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof AnimatedBorder>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <div className='flex flex-col'>
      <div className='h-[800px]' />
      <AnimatedBorder {...args} />
      <div className='h-[800px]' />
    </div>
  ),
  args: {
    animate: true,
    children: (
      <div className='px-4 py-2 text-center text-description text-sm'>
        <p>A light effect that travels around the border.</p>
      </div>
    ),
  },
};
