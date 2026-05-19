//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DiscordWidget } from './DiscordWidget';

const meta = {
  title: 'plugins/plugin-support/containers/DiscordWidget',
  component: DiscordWidget,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DiscordWidget>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
