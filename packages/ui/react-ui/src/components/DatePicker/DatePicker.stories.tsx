//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { type DateRange } from 'react-day-picker';

import { withTheme } from '../../testing';
import { translations } from '../../translations';
import { Icon } from '../Icon';
import { DatePicker } from './DatePicker';

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

export const Multiple: Story = {
  render: () => {
    const [value, setValue] = useState<Date[] | undefined>([]);
    return (
      <DatePicker.Root mode='multiple' value={value} onValueChange={setValue}>
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
          <DatePicker.TimeField />
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
          <DatePicker.TimeField endpoint='from' />
          <DatePicker.TimeField endpoint='to' />
        </DatePicker.Content>
      </DatePicker.Root>
    );
  },
};

export const ShadcnStyle: Story = {
  render: () => {
    const [value, setValue] = useState<Date | undefined>();
    return (
      <DatePicker.Root mode='single' value={value} onValueChange={setValue}>
        <DatePicker.Trigger>
          {({ label }) => (
            <>
              <Icon icon='ph--calendar--regular' size={4} />
              {label}
            </>
          )}
        </DatePicker.Trigger>
        <DatePicker.Content>
          <DatePicker.Calendar />
        </DatePicker.Content>
      </DatePicker.Root>
    );
  },
};
