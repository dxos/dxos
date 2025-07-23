//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React from 'react';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { GraphPlugin } from '@dxos/plugin-graph';
import { Stack } from '@dxos/react-ui-stack';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Plank, type PlankProps } from './Plank';
import { DeckStateFactory, translations } from '../../translations';

const meta: Meta<PlankProps> = {
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
    withPluginManager({
      plugins: [AttentionPlugin(), SettingsPlugin(), IntentPlugin(), GraphPlugin()],
      capabilities: () => DeckStateFactory(),
    }),
    withTheme,
    withLayout({ fullscreen: true }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<PlankProps>;

// TODO(burdon): Need to define surface provider?
export const Default: Story = {
  args: {
    id: 'plank-1',
    part: 'solo',
    layoutMode: 'deck',
  },
};
