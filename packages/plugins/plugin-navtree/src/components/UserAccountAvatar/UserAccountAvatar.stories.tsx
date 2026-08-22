//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';

import { UserAccountAvatar } from './UserAccountAvatar';

const meta = {
  title: 'plugins/plugin-navtree/components/UserAccountAvatar',
  decorators: [withTheme()],
  component: UserAccountAvatar,
} satisfies Meta<typeof UserAccountAvatar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** What the rail's corner shows while the client is still initialising. */
export const Placeholder: Story = {};

export const Identity: Story = {
  args: { userId: '9f8e7d6c5b4a39281706f5e4d3c2b1a0' },
};

/** A profile whose emoji is one that defaults to text presentation, so it needs U+FE0F to render. */
export const ChosenIdentity: Story = {
  args: { userId: '9f8e7d6c5b4a39281706f5e4d3c2b1a0', emoji: '☀️', hue: 'cyan' },
};
