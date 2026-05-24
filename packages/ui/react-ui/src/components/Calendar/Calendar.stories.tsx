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
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof Calendar>;

export const Single: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date());
    // Cast required: DayPicker discriminated union requires props combined at the type level.
    const props = { mode: 'single', selected: date, onSelect: setDate } as unknown as React.ComponentPropsWithoutRef<typeof Calendar>;
    return <Calendar {...props} />;
  },
};

export const Range: Story = {
  render: () => {
    const [range, setRange] = useState<DateRange | undefined>();
    const props = { mode: 'range', selected: range, onSelect: setRange } as unknown as React.ComponentPropsWithoutRef<typeof Calendar>;
    return <Calendar {...props} />;
  },
};

export const Multiple: Story = {
  render: () => {
    const [dates, setDates] = useState<Date[] | undefined>([]);
    const props = { mode: 'multiple', selected: dates, onSelect: setDates } as unknown as React.ComponentPropsWithoutRef<typeof Calendar>;
    return <Calendar {...props} />;
  },
};

export const WithDisabled: Story = {
  render: () => {
    const [date, setDate] = useState<Date | undefined>();
    const disabled = { before: new Date() };
    const props = { mode: 'single', selected: date, onSelect: setDate, disabled } as unknown as React.ComponentPropsWithoutRef<typeof Calendar>;
    return <Calendar {...props} />;
  },
};
