//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { format } from 'date-fns';
import React, { useState } from 'react';

import { Panel } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Calendar, type Range as DateRange } from './Calendar';

const meta = {
  title: 'ui/react-ui-calendar/Calendar',
  component: Calendar.Grid,
  parameters: {
    translations,
  },
} satisfies Meta<typeof Calendar.Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  render: () => (
    <Calendar.Root>
      <Calendar.Toolbar />
      <Calendar.Grid rows={6} />
    </Calendar.Root>
  ),
};

export const Range: Story = {
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  render: () => {
    const [range, setRange] = useState<DateRange | undefined>();
    return (
      <div className='flex flex-col gap-2'>
        <Calendar.Root>
          <Calendar.Toolbar />
          <Calendar.Grid rows={6} onSelectRange={({ range }) => setRange(range)} />
        </Calendar.Root>
        <div className='text-sm text-description text-center'>
          {range ? `${format(range.from, 'PP')} → ${format(range.to, 'PP')}` : 'Drag across days to select a range.'}
        </div>
      </div>
    );
  },
};

export const Column: Story = {
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-auto' })],
  render: () => (
    <Calendar.Root>
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Calendar.Toolbar />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Calendar.Grid />
        </Panel.Content>
      </Panel.Root>
    </Calendar.Root>
  ),
};
