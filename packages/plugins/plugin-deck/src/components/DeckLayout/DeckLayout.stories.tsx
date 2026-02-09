//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Capability, Common, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { withTheme } from '@dxos/react-ui/testing';

import { DeckState, LayoutOperationResolver } from '../../capabilities';
import { meta as pluginMeta } from '../../meta';
import { translations } from '../../translations';

import { DeckLayout } from './DeckLayout';

const TestPlugin = Plugin.define(pluginMeta).pipe(
  Plugin.addModule({
    id: Capability.getModuleTag(DeckState),
    activatesOn: Common.ActivationEvent.AppGraphReady,
    activate: () => DeckState(),
  }),
  Common.Plugin.addOperationResolverModule({
    activate: LayoutOperationResolver,
  }),
  Plugin.make,
);

const meta = {
  title: 'plugins/plugin-deck/DeckLayout',
  component: DeckLayout,
  render: (args) => <DeckLayout {...args} />,
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [...corePlugins(), TestPlugin()],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DeckLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
