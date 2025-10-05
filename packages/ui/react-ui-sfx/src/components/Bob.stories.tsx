//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Blob } from './Blob';

const meta = {
  title: 'ui/react-ui-sfx/Blob',
  component: Blob,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Blob>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    color: '#005599',
    speed: 0.3,
    enableMouseInteraction: true,
    hoverSmoothness: 0.05,
    animationSize: 30,
    ballCount: 15,
    clumpFactor: 1,
    cursorBallSize: 3,
    cursorBallColor: '#000077',
    enableTransparency: true,
  },
};
