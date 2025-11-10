//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import { Calendar } from './Calendar';

const meta = {
  title: 'ui/react-ui-calendar/Calendar',
  component: Calendar,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Calendar>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Basic CalendarGrid with default styling.
 */
export const Default: Story = {
  render: () => {
    return (
      <div className='_h-[40rem]'>
        <Calendar classNames='bg-modalSurface border border-separator rounded' />
      </div>
    );
  },
};
