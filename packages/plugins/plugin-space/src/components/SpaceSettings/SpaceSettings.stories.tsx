//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { SpaceSettings } from './SpaceSettings';

const meta = {
  title: 'plugins/plugin-space/components/SpaceSettings',
  component: SpaceSettings,
  tags: ['settings'],
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof SpaceSettings>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: {
      showHidden: false,
    },
  },
};
