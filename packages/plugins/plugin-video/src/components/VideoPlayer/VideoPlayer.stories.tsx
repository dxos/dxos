//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { VideoPlayer } from './VideoPlayer';

const meta = {
  title: 'plugins/plugin-video/components/VideoPlayer',
  component: VideoPlayer,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
} satisfies Meta<typeof VideoPlayer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const YouTube: Story = {
  args: {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    classNames: 'w-[40rem]',
  },
};

export const Vimeo: Story = {
  args: {
    url: 'https://vimeo.com/76979871',
    classNames: 'w-[40rem]',
  },
};

export const Empty: Story = {
  args: {
    classNames: 'w-[40rem]',
  },
};
