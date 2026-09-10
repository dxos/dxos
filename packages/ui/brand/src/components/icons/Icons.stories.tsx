//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { type Channel, CHANNELS, channelMarkFilter } from '../../channels';
import { Composer } from './Composer';
import { DXNS } from './DXNS';
import { DXOS } from './DXOS';
import { ECHO } from './ECHO';
import { HALO } from './HALO';
import { KUBE } from './KUBE';
import { MESH } from './MESH';

const Icon = () => null;

type StoryArgs = {
  /** A prerelease channel to recolour the mark for; the released mark when unset. */
  channel?: Channel;
};

const DefaultStory = (_: StoryArgs) => {
  return (
    <div className='grid grid-cols-3 gap-16'>
      <>
        <ECHO className={mx('size-30 fill-sky-700')} />
        <HALO className={mx('size-30 fill-violet-700')} />
        <MESH className={mx('size-30 fill-green-700')} />
      </>
      <>
        <DXNS className={mx('size-30 fill-neutral-700')} />
        <DXOS className={mx('size-30 fill-neutral-700')} />
        <KUBE className={mx('size-30 fill-neutral-700')} />
      </>
    </div>
  );
};

const meta = {
  title: 'ui/brand/components/Icons',
  component: Icon,
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DXOSLogo: Story = {
  render: () => {
    return (
      <div className='grid grid-cols-4 gap-16'>
        <div className='size-24 flex justify-center items-center bg-base-surface rounded-md'>
          <DXOS className={mx('size-16 fill-sky-700')} />
        </div>
        <div className='size-24 flex justify-center items-center bg-base-surface rounded-md'>
          <DXOS className={mx('size-10 fill-sky-700')} />
        </div>
        <div className='size-24 flex justify-center items-center bg-base-surface rounded-md'>
          <DXOS className={mx('size-8 fill-sky-700')} />
        </div>
        <div className='size-24 flex justify-center items-center bg-base-surface rounded-md'>
          <DXOS className={mx('size-6 fill-sky-700')} />
        </div>
      </div>
    );
  },
};

export const Channels: Story = {
  render: () => {
    const marks: { label: string; channel?: Channel }[] = [
      { label: 'production' },
      ...CHANNELS.map((channel) => ({ label: channel, channel })),
    ];

    return (
      <div className='flex gap-8 p-8'>
        {marks.map(({ label, channel }) => (
          <div key={label} className='flex flex-col items-center gap-3'>
            <div style={{ filter: channel && channelMarkFilter(channel) }}>
              <Composer size={180} weight='regular' />
            </div>
            <span className='text-sm text-description'>{label}</span>
          </div>
        ))}
      </div>
    );
  },
};
