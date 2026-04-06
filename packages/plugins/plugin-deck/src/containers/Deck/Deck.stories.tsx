//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback } from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { useAtomCapability, usePluginManager } from '@dxos/app-framework/ui';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { corePlugins } from '@dxos/plugin-testing';
import { withLayout } from '@dxos/react-ui/testing';

import { useDeckState } from '../../hooks';

import { meta as pluginMeta } from '../../meta';
import { translations } from '../../translations';
import { DeckCapabilities, getMode } from '../../types';

import { Deck } from './Deck';

import { DeckSettings, DeckState } from '#capabilities';

const TestPlugin = Plugin.define(pluginMeta).pipe(
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupSettings,
    activate: DeckSettings,
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(DeckState),
    activatesOn: AppActivationEvents.AppGraphReady,
    activate: () => DeckState(),
  }),
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
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [...corePlugins(), TestPlugin()],
      setupEvents: [AppActivationEvents.SetupSettings],
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
