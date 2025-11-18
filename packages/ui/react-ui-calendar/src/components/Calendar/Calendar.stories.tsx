//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { Calendar } from './Calendar';

const meta = {
  title: 'ui/react-ui-calendar/Calendar',
  component: Calendar.Grid,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof Calendar.Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Calendar.Root>
      <Calendar.Viewport>
        <Calendar.Toolbar />
        <Calendar.Grid rows={6} />
      </Calendar.Viewport>
    </Calendar.Root>
  ),
};

export const Border: Story = {
  render: () => (
    <Calendar.Root>
      <Calendar.Viewport classNames='bg-modalSurface border border-separator rounded'>
        <Calendar.Toolbar />
        <Calendar.Grid rows={6} />
      </Calendar.Viewport>
    </Calendar.Root>
  ),
};

export const Column: Story = {
  render: () => (
    <div className='absolute inset-0 flex bs-full justify-center'>
      <Calendar.Root>
        <Calendar.Viewport>
          <Calendar.Toolbar />
          <Calendar.Grid />
        </Calendar.Viewport>
      </Calendar.Root>
    </div>
  ),
};

export const Mobile: Story = {
  render: () => (
    <div className='absolute inset-0 flex bs-full justify-center'>
      <div className='flex bs-full is-[400px] justify-center'>
        <Calendar.Root>
          <Calendar.Viewport classNames='is-full'>
            <Calendar.Toolbar />
            <Calendar.Grid />
          </Calendar.Viewport>
        </Calendar.Root>
      </div>
    </div>
  ),
};
