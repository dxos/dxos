//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Schedule, type ScheduleValue } from './Schedule';

const DefaultStory = ({ initial }: { initial: ScheduleValue }) => {
  const [value, setValue] = useState<ScheduleValue>(initial);

  return (
    <div className='p-4 flex flex-col gap-3'>
      <Schedule.Root
        classNames='bg-card-surface border border-separator rounded-sm p-2'
        timezone='EDT'
        value={value}
        onValueChange={setValue}
      >
        <Schedule.Header />
        <Schedule.Kind />
        <Schedule.Body />
      </Schedule.Root>
      <div className='flex flex-col gap-1'>
        <p className='text-xs text-subdued'>Value</p>
        <pre className='font-mono text-sm bg-base-surface rounded p-2 whitespace-pre-wrap'>
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-routine/components/Schedule',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Weekly: Story = {
  args: { initial: { kind: 'weekly', time: '09:00', days: ['mon'] } },
};

export const Hourly: Story = {
  args: { initial: { kind: 'hourly', minute: 0 } },
};

export const Monthly: Story = {
  args: { initial: { kind: 'monthly', day: 1, time: '09:00' } },
};

export const Custom: Story = {
  args: { initial: { kind: 'custom', cron: '0 9 * * MON-FRI' } },
};
