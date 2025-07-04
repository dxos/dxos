//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Blob, type BlobProps } from './Blob';

const meta: Meta<BlobProps> = {
  title: 'ui/react-ui-sfx/Blob',
  component: Blob,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<BlobProps>;

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
