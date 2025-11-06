//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Events, IntentPlugin, SettingsPlugin, defineModule, definePlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { GraphPlugin } from '@dxos/plugin-graph';
import { withTheme } from '@dxos/react-ui/testing';

import { DeckStateFactory, LayoutIntentResolver } from '../../capabilities';
import { meta as pluginMeta } from '../../meta';
import { translations } from '../../translations';

import { DeckLayout } from './DeckLayout';

const meta = {
  title: 'plugins/plugin-deck/DeckLayout',
  component: DeckLayout,
  render: (args) => <DeckLayout {...args} />,
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [
        AttentionPlugin(),
        SettingsPlugin(),
        IntentPlugin(),
        GraphPlugin(),
        definePlugin(
          {
            id: 'example.com/plutin/testing',
            name: 'Testing',
          },
          () => [
            defineModule({
              id: `${pluginMeta.id}/module/deck-state`,
              activatesOn: Events.AppGraphReady,
              activate: () => DeckStateFactory(),
            }),
            defineModule({
              id: `${pluginMeta.id}/module/layout-intent-resolver`,
              activatesOn: Events.SetupIntentResolver,
              activate: LayoutIntentResolver,
            }),
          ],
        )(),
      ],
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
