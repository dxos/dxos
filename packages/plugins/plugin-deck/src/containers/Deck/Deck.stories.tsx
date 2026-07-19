//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useAtomCapability, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppCapabilities, AppPlugin, LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { corePlugins } from '@dxos/plugin-testing';
import { useAsyncEffect } from '@dxos/react-hooks';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';

import { DeckSettings, DeckState, OperationHandler } from '#capabilities';
import { useDeckState } from '#hooks';
import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';
import { DeckCapabilities } from '#types';

import { Deck } from './Deck';

const STORY_ITEMS = [
  { id: 'story-item-1', title: 'Item 1' },
  { id: 'story-item-2', title: 'Item 2' },
];

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
  AppPlugin.addOperationHandlerModule({
    activate: OperationHandler,
  }),
  AppPlugin.addSurfaceModule({
    id: 'story-surfaces',
    activate: () =>
      Effect.succeed(
        Capability.contributes(Capabilities.ReactSurface, [
          Surface.create({
            id: 'storyArticle',
            filter: Surface.makeFilter(AppSurface.Article),
            component: ({ data }) => <div className='p-4'>{data.attendableId}</div>,
          }),
        ]),
      ),
  }),
  AppPlugin.addAppGraphModule({
    id: 'story-graph',
    activate: Effect.fnUntraced(function* () {
      const extensions = yield* GraphBuilder.createExtension({
        id: 'storyItems',
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed(
            STORY_ITEMS.map((item) =>
              Node.make({
                id: item.id,
                type: 'story-item',
                data: item,
                properties: { label: item.title, icon: 'ph--file--regular' },
              }),
            ),
          ),
      });
      return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
    }),
  }),
  Plugin.make,
);

const DefaultStory = () => {
  const settings = useAtomCapability(DeckCapabilities.Settings);
  const pluginManager = usePluginManager();
  const { state, deck, updateState } = useDeckState();

  return (
    <Deck.Root settings={settings} pluginManager={pluginManager} state={state} deck={deck} updateState={updateState}>
      <Deck.Content>
        <Deck.Viewport>{deck.active.length === 0 ? <Deck.ContentEmpty /> : <Deck.Planks />}</Deck.Viewport>
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

export const Empty: Story = {};

export const OnePlank: Story = {
  render: () => {
    const { invokePromise } = useOperationInvoker();
    useAsyncEffect(async () => {
      // A singleton `active` list renders fullbleed; opening into a fresh deck yields that directly.
      await invokePromise(LayoutOperation.Open, { subject: [STORY_ITEMS[0].id], navigation: 'immediate' });
    });

    return <DefaultStory />;
  },
};

export const ManyPlanks: Story = {
  render: () => {
    const { invokePromise } = useOperationInvoker();
    useAsyncEffect(async () => {
      await invokePromise(LayoutOperation.Open, { subject: [STORY_ITEMS[0].id], navigation: 'immediate' });
      await invokePromise(LayoutOperation.Open, {
        subject: [STORY_ITEMS[1].id],
        disposition: 'new-plank',
        navigation: 'immediate',
      });
    });

    return <DefaultStory />;
  },
};
