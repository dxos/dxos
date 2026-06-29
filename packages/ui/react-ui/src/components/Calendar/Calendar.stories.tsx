//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '../../testing';
import { type DateRange, Calendar } from './Calendar';

const meta: Meta<typeof Calendar.Root> = {
  title: 'ui/react-ui-core/components/Calendar',
  component: Calendar.Root,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'flex flex-row p-4 justify-center' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof Calendar.Root>;

export const Single: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date());
    return <Calendar.Root mode='single' selected={date} onSelect={setDate} />;
  },
};

export const Range: Story = {
  render: () => {
    const [range, setRange] = useState<DateRange | undefined>();
    return <Calendar.Root mode='range' selected={range} onSelect={setRange} />;
  },
};

export const WithMinDate: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>();
    return <Calendar.Root mode='single' selected={date} onSelect={setDate} minValue={new Date()} />;
  },
};
