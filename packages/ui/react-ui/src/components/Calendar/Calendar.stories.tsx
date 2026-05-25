//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { type DateRange } from 'react-day-picker';

import { withLayout, withTheme } from '../../testing';
import { Calendar } from './Calendar';

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

export const Multiple: Story = {
  render: () => {
    const [dates, setDates] = useState<Date[] | undefined>([]);
    return <Calendar.Root mode='multiple' selected={dates} onSelect={setDates} />;
  },
};

export const WithDisabled: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>();
    const disabled = { before: new Date() };
    return <Calendar.Root mode='single' selected={date} onSelect={setDate} disabled={disabled} />;
  },
};
