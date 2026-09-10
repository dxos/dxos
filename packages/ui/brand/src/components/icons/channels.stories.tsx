//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type Channel, CHANNELS, channelMarkFilter } from '../../channels';
import { Composer } from './Composer';

/** The released mark beside each channel's recolouring of it, in one row, so the set reads together. */
const DefaultStory = () => {
  const marks: { label: string; channel?: Channel }[] = [
    { label: 'production' },
    ...CHANNELS.map((channel) => ({ label: channel, channel })),
  ];
  return (
    <div className='flex gap-8 p-8'>
      {marks.map(({ label, channel }) => (
        <div key={label} className='flex flex-col items-center gap-3'>
          <div style={{ filter: channel && channelMarkFilter(channel) }}>
            <Composer size={96} weight='regular' />
          </div>
          <span className='text-sm text-description'>{label}</span>
          <span className='text-xs font-mono text-subdued'>{channel ? channelMarkFilter(channel) : 'as drawn'}</span>
        </div>
      ))}
    </div>
  );
};

const meta = {
  title: 'ui/brand/components/icons/Channels',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
