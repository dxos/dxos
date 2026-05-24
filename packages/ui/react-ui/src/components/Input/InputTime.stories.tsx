//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withTheme } from '../../testing';
import { Input } from './Input';

const meta: Meta<typeof Input.Time> = {
  title: 'ui/react-ui-core/components/Input/Time',
  component: Input.Time,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof Input.Time>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('09:30');
    return (
      <Input.Root>
        <div className='flex flex-col gap-2'>
          <Input.Label>Time</Input.Label>
          <Input.Time value={value} onChange={(event) => setValue(event.target.value)} />
          <div className='text-xs text-description'>value: {value || '—'}</div>
        </div>
      </Input.Root>
    );
  },
};

export const Uncontrolled: Story = {
  render: () => (
    <Input.Root>
      <div className='flex flex-col gap-2'>
        <Input.Label>Time</Input.Label>
        <Input.Time defaultValue='14:00' />
      </div>
    </Input.Root>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Input.Root>
      <div className='flex flex-col gap-2'>
        <Input.Label>Time</Input.Label>
        <Input.Time value='12:00' disabled />
      </div>
    </Input.Root>
  ),
};
