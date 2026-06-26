//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Blob } from './Blob';

const meta = {
  title: 'ui/react-ui-experimental/Blob',
  component: Blob,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Blob>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    color: '#880000',
    speed: 0.5,
    enableMouseInteraction: true,
    hoverSmoothness: 0.9,
    animationSize: 40,
    ballCount: 15,
    clumpFactor: 0.9,
    cursorBallSize: 3,
    cursorBallColor: '#ff8800',
    enableTransparency: true,
  },
};
