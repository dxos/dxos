//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { GraphPlugin } from '@dxos/plugin-graph';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Plank, type PlankProps } from './Plank';
import { DeckPlugin } from '../../DeckPlugin';
import translations from '../../translations';

// TODO(burdon): invariant violation: No capability found for dxos.org/plugin/deck/capability/state
const meta: Meta<PlankProps> = {
  title: 'plugins/plugin-deck/Plank',
  component: Plank,
  decorators: [
    withPluginManager({
      plugins: [AttentionPlugin(), SettingsPlugin(), IntentPlugin(), GraphPlugin(), DeckPlugin()],
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
