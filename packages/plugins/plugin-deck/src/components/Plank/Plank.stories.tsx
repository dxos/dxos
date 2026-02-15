//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { corePlugins } from '@dxos/plugin-testing';
import { withTheme() } from '@dxos/react-ui/testing';
import { Stack } from '@dxos/react-ui-stack';

import { DeckState } from '../../capabilities';
import { meta as pluginMeta } from '../../meta';
import { translations } from '../../translations';

import { Plank } from './Plank';

const TestPlugin = Plugin.define(pluginMeta).pipe(
  Plugin.addModule({
    id: Capability.getModuleTag(DeckState),
    activatesOn: AppActivationEvents.AppGraphReady,
    activate: () => DeckState(),
  }),
  Plugin.make,
);

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
    withTheme(),
    withPluginManager({
      plugins: [...corePlugins(), TestPlugin()],
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
