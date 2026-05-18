//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';

import { MediaPlayer } from './MediaPlayer';

const meta = {
  title: 'ui/react-ui/MediaPlayer',
  component: MediaPlayer,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof MediaPlayer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Video: Story = {
  args: {
    src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
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
