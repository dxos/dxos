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

export const Default: Story = {};

export const WithUser: Story = {
  args: { userId: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', size: 10 },
};

export const WithBadge: Story = {
  args: { userId: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', size: 10, badge: true },
};
