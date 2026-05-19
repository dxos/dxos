//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DiscordPanel } from './DiscordPanel';

const meta = {
  title: 'plugins/plugin-support/containers/DiscordPanel',
  component: DiscordPanel,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-(--dx-r1-size)' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DiscordPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
