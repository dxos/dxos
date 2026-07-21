//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback } from 'react';

import { Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useAtomCapability, usePluginManager } from '@dxos/app-framework/ui';
import { corePlugins } from '@dxos/plugin-testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';

import { DeckSettings, DeckState } from '#capabilities';
import { useDeckState } from '#hooks';
import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';
import { DeckCapabilities, getMode } from '#types';

import { Deck } from './Deck';

const TestPlugin = Plugin.define(pluginMeta).pipe(
  Plugin.addModule(DeckSettings),
  Plugin.addModule(DeckState),
  Plugin.make,
);

const DefaultStory = () => {
  const settings = useAtomCapability(DeckCapabilities.Settings);
  const pluginManager = usePluginManager();
  const { state, deck, updateState } = useDeckState();
  const layoutMode = getMode(deck);

  const handleLayoutChange = useCallback(() => {
    console.log('layout change');
  }, []);

  return (
    <Deck.Root
      settings={settings}
      pluginManager={pluginManager}
      layoutMode={layoutMode}
      state={state}
      deck={deck}
      updateState={updateState}
      onLayoutChange={handleLayoutChange}
    >
      <Deck.Content>
        <Deck.Viewport>{deck.solo ? <Deck.SoloMode /> : <Deck.MultiMode />}</Deck.Viewport>
      </Deck.Content>
    </Deck.Root>
  );
};

const meta = {
  title: 'plugins/plugin-deck/containers/Deck',
  component: DefaultStory,
  decorators: [
    withMosaic(),
    withPluginManager({
      plugins: [...corePlugins(), TestPlugin()],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
