//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React from 'react';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import { ResponsiveContainer } from './ResponsiveContainer';

const meta: Meta<typeof ResponsiveContainer> = {
  title: 'plugins/plugin-calls/ResponsiveContainer',
  component: ResponsiveContainer,
  decorators: [
    withTheme,
    withLayout({
      tooltips: true,
      fullscreen: true,
      classNames: 'justify-center',
    }),
  ],
};

export default meta;

type Story = StoryObj<typeof ResponsiveContainer>;

export const Default: Story = {
  args: {
    children: <img src='https://placehold.co/3200x1800/333/999?font=roboto&text=X' />,
  },
};

export const Video: Story = {
  // NOTE: The video's max size is 1280x720.
  args: {
    children: (
      <video
        src='https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
        playsInline
        autoPlay
        muted
        loop
      />
    ),
  },
};

export const Custom: Story = {
  render: () => {
    return (
      <div className='flex flex-col w-full _w-[800px] h-full'>
        <div className='flex shrink-0 w-full h-[60px] p-2' />
        <div className='flex w-full grow border border-blue-500'>
          <ResponsiveContainer>
            <img src='https://placehold.co/3200x1800/333/999?font=roboto&text=X' />
          </ResponsiveContainer>
        </div>
        <div className='flex shrink-0 w-full h-[200px] p-2' />
      </div>
    );
  },
};
