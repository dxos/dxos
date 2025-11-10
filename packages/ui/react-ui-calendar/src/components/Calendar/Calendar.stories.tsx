//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { Calendar } from './Calendar';

const meta = {
  title: 'ui/react-ui-calendar/Calendar',
  component: Calendar.Grid,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Calendar.Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Calendar.Root>
      <Calendar.Viewport>
        <Calendar.Header />
        <Calendar.Grid />
      </Calendar.Viewport>
    </Calendar.Root>
  ),
};

export const Border: Story = {
  render: () => (
    <Calendar.Root>
      <Calendar.Viewport classNames='bg-modalSurface border border-separator rounded'>
        <Calendar.Header />
        <Calendar.Grid />
      </Calendar.Viewport>
    </Calendar.Root>
  ),
};

export const Column: Story = {
  render: () => (
    <Calendar.Root>
      <Calendar.Viewport classNames='absolute inset-0 flex bs-full justify-center'>
        <Calendar.Header />
        <Calendar.Grid grow />
      </Calendar.Viewport>
    </Calendar.Root>
  ),
};
