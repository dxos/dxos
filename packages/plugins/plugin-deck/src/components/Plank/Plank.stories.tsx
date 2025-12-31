//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { withTheme } from '@dxos/react-ui/testing';
import { Stack } from '@dxos/react-ui-stack';

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
      plugins: [...corePlugins()],
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
