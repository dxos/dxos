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
  /** A prerelease channel's recolouring of the Composer mark; the released mark when absent. */
  channel?: Channel;
  /** Every channel's recolouring of the Composer mark in one row, instead of the icon set. */
  channels?: boolean;
};

/** The released mark beside each channel's recolouring of it, so the set reads together. */
const ChannelsRow = () => {
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

const DefaultStory = ({ channel, channels }: StoryArgs) => {
  if (channels) {
    return <ChannelsRow />;
  }

  const size = 'w-[192px] h-[192px]';
  return (
    <div className='grid grid-cols-3 gap-16'>
      <>
        <div className='col-span-full flex justify-center' style={{ filter: channel && channelMarkFilter(channel) }}>
          <Composer className={mx(size)} />
        </div>
      </>
      <>
        <ECHO className={mx(size, 'fill-sky-700')} />
        <HALO className={mx(size, 'fill-violet-700')} />
        <MESH className={mx(size, 'fill-green-700')} />
      </>
      <>
        <DXNS className={mx(size, 'fill-neutral-700')} />
        <DXOS className={mx(size, 'fill-neutral-700')} />
        <KUBE className={mx(size, 'fill-neutral-700')} />
      </>
      <>
        <div className='flex justify-center'>
          <DXOS className={mx('size-10 fill-sky-700')} />
        </div>
        <div className='flex justify-center'>
          <DXOS className={mx('size-8 fill-sky-700')} />
        </div>
        <div className='flex justify-center'>
          <DXOS className={mx('size-6 fill-sky-700')} />
        </div>
      </>
    </div>
  );
};

const meta = {
  title: 'ui/brand/components/Icons',
  component: Icon,
  render: DefaultStory,
  argTypes: {
    channel: { control: 'select', options: [undefined, ...CHANNELS] },
  },
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The set as a channel build shows it: the Composer mark recoloured, the rest as drawn. */
export const Preview: Story = {
  args: { channel: 'preview' },
};

/** The released mark beside every channel's recolouring of it. */
export const Channels: Story = {
  args: { channels: true },
};
