//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { type DateRange } from 'react-day-picker';

import { withTheme } from '../../testing';
import { Calendar } from './Calendar';

const meta: Meta<typeof Calendar> = {
  title: 'ui/react-ui-core/Calendar',
  component: Calendar,
  decorators: [withTheme],
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof Calendar>;

export const Single: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date());
    return <Calendar mode='single' selected={date} onSelect={setDate} />;
  },
};

export const Range: Story = {
  render: () => {
    const [range, setRange] = useState<DateRange | undefined>();
    return <Calendar mode='range' selected={range} onSelect={setRange} />;
  },
};

export const Multiple: Story = {
  render: () => {
    const [dates, setDates] = useState<Date[] | undefined>([]);
    return <Calendar mode='multiple' selected={dates} onSelect={setDates} />;
  },
};

export const WithDisabled: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>();
    const disabled = { before: new Date() };
    return <Calendar mode='single' selected={date} onSelect={setDate} disabled={disabled} />;
  },
};
