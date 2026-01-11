//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withPluginManager } from '@dxos/app-framework/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { BottomNav } from './BottomNav';

const meta = {
  title: 'plugins/plugin-simple-layout/BottomNav',
  component: BottomNav,
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [...corePlugins()],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
  argTypes: {
    onActiveIdChange: { action: 'activeIdChanged' },
  },
} satisfies Meta<typeof BottomNav>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    activeId: undefined,
  },
};

export const BrowseActive: Story = {
  args: {
    activeId: 'some-document',
  },
};

export const NotificationsActive: Story = {
  args: {
    activeId: 'notifications',
  },
};

export const ProfileActive: Story = {
  args: {
    activeId: 'profile',
  },
};
