//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Common, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { withTheme } from '@dxos/react-ui/testing';

import { DeckStateFactory, LayoutIntentResolver } from '../../capabilities';
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
        ...corePlugins(),
        Plugin.define({
          id: 'example.com/plutin/testing',
          name: 'Testing',
        }).pipe(
          Plugin.addModule({
            id: 'deck-state',
            activatesOn: Common.ActivationEvent.AppGraphReady,
            activate: () => Effect.succeed(DeckStateFactory()),
          }),
          Plugin.addModule({
            id: 'layout-intent-resolver',
            activatesOn: Common.ActivationEvent.SetupIntentResolver,
            activate: LayoutIntentResolver,
          }),
          Plugin.make,
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
