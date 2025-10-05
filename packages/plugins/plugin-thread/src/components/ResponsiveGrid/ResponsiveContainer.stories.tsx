//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';
import { VideoObject as VideoObjectComponent } from '../Media';

import { ResponsiveContainer } from './ResponsiveContainer';

const meta = {
  title: 'plugins/plugin-thread/ResponsiveContainer',
  component: ResponsiveContainer,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ResponsiveContainer>;

export default meta;

type Story = StoryObj<typeof ResponsiveContainer>;

export const Image: Story = {
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

export const VideoObject: Story = {
  args: {
    children: <VideoObjectComponent classNames='rounded-md outline outline-primary-500' />,
  },
};
