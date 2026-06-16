//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { describeCron, toCron } from './cron';
import { CronBuilder } from './CronBuilder';
import { FrequencyDefaults, type CronSpecType } from './schema';

const DefaultStory = () => {
  const [value, setValue] = useState<CronSpecType>(FrequencyDefaults.daily);
  const cronString = toCron(value);
  const description = describeCron(cronString);

  return (
    <div className='grid grid-cols-[1fr_1fr] gap-4 p-4'>
      <div className='dx-container bg-card-surface rounded-md'>
        <CronBuilder value={value} onChange={(v) => setValue(v)} />
      </div>
      <div className='dx-container bg-card-surface rounded-md p-4 flex flex-col gap-3'>
        <div>
          <p className='text-xs text-subdued mb-1'>Cron expression</p>
          <code className='font-mono text-sm bg-baseSurface rounded px-2 py-1'>{cronString}</code>
        </div>
        <div>
          <p className='text-xs text-subdued mb-1'>Description</p>
          <p className='text-sm'>{description}</p>
        </div>
      </div>
    </div>
  );
};

const ReadonlyStory = () => {
  const value = FrequencyDefaults.weekly;
  return (
    <div className='p-4'>
      <div className='dx-container bg-card-surface rounded-md max-w-sm'>
        <CronBuilder value={value} readonly />
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-automation/components/CronBuilder',
  component: CronBuilder,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations: [...formTranslations, ...translations],
  },
} satisfies Meta<typeof CronBuilder>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: DefaultStory,
};

export const Readonly: Story = {
  render: ReadonlyStory,
};
