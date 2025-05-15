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

import { Plank } from './Plank';
import { DeckPlugin } from '../../DeckPlugin';
import translations from '../../translations';

// TODO(burdon): invariant violation: No capability found for dxos.org/plugin/deck/capability/state
const meta: Meta<typeof Plank> = {
  title: 'plugins/plugin-deck/Plank',
  component: Plank,
  decorators: [
    withPluginManager({
      plugins: [IntentPlugin(), GraphPlugin(), DeckPlugin(), SettingsPlugin(), AttentionPlugin()],
    }),
    withTheme,
    withLayout({ fullscreen: true }),
  ],
  parameters: {
    layout: 'centered',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'plank-1',
    part: 'solo',
    layoutMode: 'solo',
  },
};
