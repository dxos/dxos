//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { GraphPlugin } from '@dxos/plugin-graph';
import { Stack } from '@dxos/react-ui-stack';
import { withTheme } from '@dxos/storybook-utils';

import { DeckStateFactory } from '../../capabilities';
import { translations } from '../../translations';

import { Plank } from './Plank';

const meta = {
  title: 'plugins/plugin-deck/Plank',
  component: Plank,
  render: (args) => {
    return (
      <Stack orientation='horizontal'>
        <Plank {...args} />
      </Stack>
    );
  },
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [AttentionPlugin(), SettingsPlugin(), IntentPlugin(), GraphPlugin()],
      capabilities: () => DeckStateFactory(),
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof Plank>;

export default meta;

type Story = StoryObj<typeof meta>;

// TODO(burdon): Need to define surface provider?
export const Default: Story = {
  args: {
    id: 'plank-1',
    part: 'solo',
    layoutMode: 'deck',
  },
};
