//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';

import { UserAccountAvatar } from './UserAccountAvatar.tsx';

const meta = {
  title: 'plugins/plugin-navtree/components/UserAccountAvatar',
  decorators: [withTheme()],
  component: UserAccountAvatar,
} satisfies Meta<typeof UserAccountAvatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {};

export const Identity: Story = {
  args: { userId: '9f8e7d6c5b4a39281706f5e4d3c2b1a0' },
};

export const ChosenIdentity: Story = {
  args: { userId: '9f8e7d6c5b4a39281706f5e4d3c2b1a0', emoji: '☀️', hue: 'cyan' },
};
