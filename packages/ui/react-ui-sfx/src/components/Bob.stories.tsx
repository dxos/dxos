//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react';

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
    color: '#005500',
    cursorBallColor: '#000000',
    enableTransparency: true,
  },
};
