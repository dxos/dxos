//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { format } from 'date-fns';
import React, { useState } from 'react';
import { type DateRange } from 'react-day-picker';

import { withTheme } from '../../testing';
import { translations } from '../../translations';
import { DatePicker } from './DatePicker';

const meta: Meta<typeof DatePicker.TimeField> = {
  title: 'ui/react-ui-core/components/DatePicker/TimeField',
  component: DatePicker.TimeField,
  decorators: [withTheme()],
  parameters: { layout: 'centered', translations },
};

export default meta;

type Story = StoryObj<typeof DatePicker.TimeField>;

const Preview = ({ children }: { children: React.ReactNode }) => (
  <div className='flex flex-col gap-2 p-2 dx-base-surface'>{children}</div>
);

const formatTime = (date: Date | undefined) => (date ? format(date, 'PPP p') : '—');

export const Single: Story = {
  render: () => {
    const [value, setValue] = useState<Date | undefined>(new Date());
    return (
      <DatePicker.Root mode='single' withTime value={value} onValueChange={setValue}>
        <Preview>
          <DatePicker.TimeField />
          <div className='text-xs text-description'>{formatTime(value)}</div>
        </Preview>
      </DatePicker.Root>
    );
  },
};

export const Range: Story = {
  render: () => {
    const now = new Date();
    const [value, setValue] = useState<DateRange | undefined>({ from: now, to: now });
    return (
      <DatePicker.Root mode='range' withTime value={value} onValueChange={setValue}>
        <Preview>
          <DatePicker.TimeField endpoint='from' />
          <DatePicker.TimeField endpoint='to' />
          <div className='text-xs text-description'>
            {formatTime(value?.from)} → {formatTime(value?.to)}
          </div>
        </Preview>
      </DatePicker.Root>
    );
  },
};

export const Multiple: Story = {
  render: () => {
    const [value, setValue] = useState<Date[] | undefined>([new Date()]);
    return (
      <DatePicker.Root mode='multiple' withTime value={value} onValueChange={setValue}>
        <Preview>
          <DatePicker.TimeField />
          <div className='text-xs text-description'>
            {(value ?? []).map((date, index) => (
              <div key={index}>{formatTime(date)}</div>
            ))}
          </div>
        </Preview>
      </DatePicker.Root>
    );
  },
};

export const WithoutTime: Story = {
  name: 'withTime=false (renders nothing)',
  render: () => {
    const [value, setValue] = useState<Date | undefined>(new Date());
    return (
      <DatePicker.Root mode='single' value={value} onValueChange={setValue}>
        <Preview>
          <DatePicker.TimeField />
          <div className='text-xs text-description'>
            TimeField returns null when withTime is unset; current value: {formatTime(value)}
          </div>
        </Preview>
      </DatePicker.Root>
    );
  },
};
