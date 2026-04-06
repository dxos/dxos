//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { SpacePluginSettings } from './SpacePluginSettings';

const meta = {
  title: 'plugins/plugin-space/components/SpacePluginSettings',
  component: SpacePluginSettings,
  tags: ['settings'],
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof SpacePluginSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: {
      showHidden: false,
    },
  },
};
