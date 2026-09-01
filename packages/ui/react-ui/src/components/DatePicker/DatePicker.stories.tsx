//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { format } from 'date-fns';
import React, { useState } from 'react';

import { translations } from '#translations';

import { withTheme } from '../../testing/index.ts';
import { type DateRange } from '../Calendar/index.ts';
import { Input } from '../Input/index.ts';
import { DatePicker } from './DatePicker.tsx';

const toTime = (date: Date | undefined) => (date ? format(date, 'HH:mm') : '');
const applyTime = (date: Date | undefined, time: string): Date => {
  const [hours, minutes] = time.split(':').map((part) => parseInt(part, 10));
  const out = date ? new Date(date) : new Date();
  out.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return out;
};

const meta: Meta<typeof DatePicker.Root> = {
  title: 'ui/react-ui-core/components/DatePicker',
  decorators: [withTheme()],
  parameters: { layout: 'centered', translations },
};

export default meta;

type Story = StoryObj;

export const Single: Story = {
  render: () => {
    const [value, setValue] = useState<Date | undefined>();
    return (
      <DatePicker.Root mode='single' value={value} onValueChange={setValue}>
        <DatePicker.Trigger />
        <DatePicker.Content>
          <DatePicker.Calendar />
        </DatePicker.Content>
      </DatePicker.Root>
    );
  },
};

export const Range: Story = {
  render: () => {
    const [value, setValue] = useState<DateRange | undefined>();
    return (
      <DatePicker.Root mode='range' value={value} onValueChange={setValue}>
        <DatePicker.Trigger />
        <DatePicker.Content>
          <DatePicker.Calendar />
        </DatePicker.Content>
      </DatePicker.Root>
    );
  },
};

export const SingleWithTime: Story = {
  render: () => {
    const [value, setValue] = useState<Date | undefined>();
    return (
      <DatePicker.Root mode='single' withTime value={value} onValueChange={setValue}>
        <DatePicker.Trigger format='PPP p' />
        <DatePicker.Content>
          <DatePicker.Calendar />
          <Input.Root>
            <Input.Time value={toTime(value)} onValueChange={(next) => setValue(applyTime(value, next))} />
          </Input.Root>
        </DatePicker.Content>
      </DatePicker.Root>
    );
  },
};

export const RangeWithTime: Story = {
  render: () => {
    const [value, setValue] = useState<DateRange | undefined>();
    return (
      <DatePicker.Root mode='range' withTime value={value} onValueChange={setValue}>
        <DatePicker.Trigger format='PPP p' />
        <DatePicker.Content>
          <DatePicker.Calendar />
          <Input.Root>
            <Input.Time
              value={toTime(value?.from)}
              onValueChange={(next) => setValue(value ? { ...value, from: applyTime(value.from, next) } : undefined)}
            />
          </Input.Root>
          <Input.Root>
            <Input.Time
              value={toTime(value?.to)}
              onValueChange={(next) => setValue(value?.from ? { ...value, to: applyTime(value.to, next) } : undefined)}
            />
          </Input.Root>
        </DatePicker.Content>
      </DatePicker.Root>
    );
  },
};
