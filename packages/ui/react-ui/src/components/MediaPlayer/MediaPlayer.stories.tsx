//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';

import { MediaPlayer } from './MediaPlayer';

const meta = {
  title: 'ui/react-ui-core/components/MediaPlayer',
  component: MediaPlayer,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof MediaPlayer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Video: Story = {
  args: {
    // TODO(burdon): CORS issue.
    src: 'https://customer-5rxcjpyab08avpmn.cloudflarestream.com/f58459bcdf3a6f3e93644a4e0f39b22a/downloads/default.mp4',
    classNames: 'max-w-[640px]',
  },
};

export const Audio: Story = {
  args: {
    src: 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3',
    classNames: 'min-w-[480px]',
  },
};

export const ExplicitKind: Story = {
  args: {
    src: 'https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3',
    kind: 'audio',
    classNames: 'min-w-[480px]',
  },
};

export const Streaming: Story = {
  args: {
    src: 'https://customer-5rxcjpyab08avpmn.cloudflarestream.com/f58459bcdf3a6f3e93644a4e0f39b22a/iframe?poster=https%3A%2F%2Fcustomer-5rxcjpyab08avpmn.cloudflarestream.com%2Ff58459bcdf3a6f3e93644a4e0f39b22a%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600',
    classNames: 'min-w-[480px]',
  },
};
