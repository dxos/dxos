//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/storybook-utils';

import { UserAccountAvatar } from './UserAccountAvatar';

const meta = {
  title: 'plugins/plugin-navtree/UserAccountAvatar',
  component: UserAccountAvatar,
  decorators: [withTheme],
} satisfies Meta<typeof UserAccountAvatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
