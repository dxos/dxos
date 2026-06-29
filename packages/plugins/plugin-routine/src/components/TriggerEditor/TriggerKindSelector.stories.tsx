//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { type TriggerKind, TriggerKindSelector } from './TriggerKindSelector';

const DefaultStory = () => {
  const [kind, setKind] = useState<TriggerKind | undefined>();

  return (
    <div className='p-4 flex flex-col gap-3'>
      <TriggerKindSelector onChange={setKind} />
      <div className='flex flex-col gap-1'>
        <p className='text-xs text-subdued'>Selected kind</p>
        <pre className='font-mono text-sm bg-base-surface rounded p-2'>{kind ?? '(none)'}</pre>
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-routine/components/TriggerKindSelector',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
