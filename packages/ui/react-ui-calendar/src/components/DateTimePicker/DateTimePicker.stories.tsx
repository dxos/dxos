//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { format } from 'date-fns';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DateTimePicker } from './DateTimePicker';
import { type DateTimeRange } from './types';

const meta = {
  title: 'ui/react-ui-calendar/DateTimePicker',
  parameters: {
    translations,
  },
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const DateMode: Story = {
  render: () => {
    const [value, setValue] = useState<Date>(new Date(2026, 4, 24));
    return (
      <DateTimePicker.Root mode='date' value={value} onValueChange={setValue}>
        <DateTimePicker.Input />
        <DateTimePicker.Content />
        <div className='text-sm text-description text-center mt-2'>{format(value, 'PP')}</div>
      </DateTimePicker.Root>
    );
  },
};

export const DateTimeMode: Story = {
  render: () => {
    const [value, setValue] = useState<Date>(new Date(2026, 4, 24, 14, 30));
    return (
      <DateTimePicker.Root mode='date-time' value={value} onValueChange={setValue}>
        <DateTimePicker.Input />
        <DateTimePicker.Content />
        <div className='text-sm text-description text-center mt-2'>{format(value, 'PPp')}</div>
      </DateTimePicker.Root>
    );
  },
};

export const DateRangeMode: Story = {
  render: () => {
    const [value, setValue] = useState<DateTimeRange>({
      from: new Date(2026, 4, 24),
      to: new Date(2026, 4, 28),
    });
    return (
      <DateTimePicker.Root mode='date-range' value={value} onValueChange={setValue}>
        <DateTimePicker.Input />
        <DateTimePicker.Content />
        <div className='text-sm text-description text-center mt-2'>
          {format(value.from, 'PP')} → {format(value.to, 'PP')}
        </div>
      </DateTimePicker.Root>
    );
  },
};

export const DateTimeRangeMode: Story = {
  render: () => {
    const [value, setValue] = useState<DateTimeRange>({
      from: new Date(2026, 4, 24, 9, 0),
      to: new Date(2026, 4, 24, 17, 0),
    });
    return (
      <DateTimePicker.Root mode='date-time-range' value={value} onValueChange={setValue}>
        <DateTimePicker.Input />
        <DateTimePicker.Content />
        <div className='text-sm text-description text-center mt-2'>
          {format(value.from, 'PPp')} → {format(value.to, 'PPp')}
        </div>
      </DateTimePicker.Root>
    );
  },
};

export const TimeMode: Story = {
  render: () => {
    const [value, setValue] = useState<Date>(new Date(2026, 4, 24, 14, 30));
    return (
      <DateTimePicker.Root mode='time' value={value} onValueChange={setValue}>
        <DateTimePicker.Input />
        <DateTimePicker.Content />
        <div className='text-sm text-description text-center mt-2'>{format(value, 'p')}</div>
      </DateTimePicker.Root>
    );
  },
};

export const TimeRangeMode: Story = {
  render: () => {
    const [value, setValue] = useState<DateTimeRange>({
      from: new Date(2026, 4, 24, 9, 0),
      to: new Date(2026, 4, 24, 17, 0),
    });
    return (
      <DateTimePicker.Root mode='time-range' value={value} onValueChange={setValue}>
        <DateTimePicker.Input />
        <DateTimePicker.Content />
        <div className='text-sm text-description text-center mt-2'>
          {format(value.from, 'p')} → {format(value.to, 'p')}
        </div>
      </DateTimePicker.Root>
    );
  },
};

export const Uncontrolled: Story = {
  render: () => (
    <DateTimePicker.Root mode='date-time' defaultValue={new Date(2026, 4, 24, 14, 30)}>
      <DateTimePicker.Input />
      <DateTimePicker.Content />
    </DateTimePicker.Root>
  ),
};

export const LocaleDeDE: Story = {
  render: () => {
    const [value, setValue] = useState<Date>(new Date(2026, 4, 24, 14, 30));
    return (
      <DateTimePicker.Root mode='date-time' locale='de-DE' value={value} onValueChange={setValue}>
        <DateTimePicker.Input />
        <DateTimePicker.Content />
      </DateTimePicker.Root>
    );
  },
};
