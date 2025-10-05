//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';
import { UserAccountAvatar } from './UserAccountAvatar';

const meta = {
  title: 'plugins/plugin-navtree/UserAccountAvatar',

  decorators: [withTheme],
  component: UserAccountAvatar,
} satisfies Meta<typeof UserAccountAvatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
