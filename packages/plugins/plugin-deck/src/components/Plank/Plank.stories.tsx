//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect } from 'react';

import {
  contributes,
  createIntent,
  useIntentDispatcher,
  Capabilities,
  IntentPlugin,
  LayoutAction,
  SettingsPlugin,
} from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { GraphPlugin } from '@dxos/plugin-graph';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Plank, type PlankProps } from './Plank';
import { DeckPlugin } from '../../DeckPlugin';
import translations from '../../translations';

const meta: Meta<PlankProps> = {
  title: 'plugins/plugin-deck/Plank',
  component: Plank,
  render: (args) => {
    const { dispatch } = useIntentDispatcher();
    useEffect(() => {
      dispatch(createIntent(LayoutAction.Open, { part: 'main', subject: ['plank-1'] }));
    }, []);

    return <></>;
  },
  decorators: [
    withPluginManager({
      // TODO(burdon): Only use DeckPlugin for Deck.stories.tsx
      plugins: [AttentionPlugin(), SettingsPlugin(), IntentPlugin(), GraphPlugin(), DeckPlugin()],
      capabilities: () => [
        contributes(Capabilities.AppGraphBuilder, [
          // TODO(burdon): ???
        ]),
      ],
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
