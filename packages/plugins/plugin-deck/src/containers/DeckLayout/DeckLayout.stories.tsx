//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppCapabilities, AppPlugin, LayoutOperation } from '@dxos/app-toolkit';
import { Node, GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { corePlugins } from '@dxos/plugin-testing';
import { useAsyncEffect } from '@dxos/react-hooks';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { DeckLayoutStoryNavigation } from '#testing';

import { translations } from '../../translations';

import { DeckLayout } from './DeckLayout';

import { DeckSettings, DeckState, OperationHandler } from '#capabilities';

const STORY_ITEM_SEGMENTS = ['story-a', 'story-b', 'story-c', 'story-d', 'story-e'];
const STORY_ITEMS = STORY_ITEM_SEGMENTS.map((id) => `${Node.RootId}/${id}`);

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
            id: 'story-navigation',
            role: 'navigation',
            filter: (data): data is { current: string } => typeof (data as any).current === 'string',
            component: ({ data, ref }) => <DeckLayoutStoryNavigation current={data.current} ref={ref} />,
          }),
          Surface.create({
            id: 'story-article',
            role: 'article',
            component: ({ data }) => {
              const subject = (data as any)?.subject;
              if (!subject) {
                return <Loading />;
              }
              return (
                <Json.Root data={subject}>
                  <Json.Content />
                </Json.Root>
              );
            },
          }),
        ]),
      ),
  }),
  AppPlugin.addAppGraphModule({
    id: 'story-graph',
    activate: Effect.fnUntraced(function* () {
      const extensions = yield* GraphBuilder.createExtension({
        id: 'story-items',
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed(
            STORY_ITEMS.map((id, index) => ({
              id,
              type: 'story-item',
              data: { id, title: `Story Item ${index + 1}` },
              properties: {
                label: `Item ${index + 1}`,
                icon: 'ph--file--regular',
              },
            })),
          ),
      });
      return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
    }),
  }),
  Plugin.make,
);

const meta = {
  title: 'plugins/plugin-deck/containers/DeckLayout',
  component: DeckLayout,
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
} satisfies Meta<typeof DeckLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const SoloStory = () => {
  const { invokePromise } = useOperationInvoker();

  useAsyncEffect(async () => {
    await invokePromise(LayoutOperation.Open, { subject: [STORY_ITEMS[0]], navigation: 'immediate' });
    await invokePromise(LayoutOperation.SetLayoutMode, { mode: 'solo', subject: STORY_ITEMS[0] });
  });

  return <DeckLayout />;
};

export const Solo: Story = {
  render: () => <SoloStory />,
};

const MultiStory = () => {
  const { invokePromise } = useOperationInvoker();

  useAsyncEffect(async () => {
    await invokePromise(LayoutOperation.SetLayoutMode, { mode: 'multi' });
    await invokePromise(LayoutOperation.Open, {
      subject: [STORY_ITEMS[0], STORY_ITEMS[1], STORY_ITEMS[2]],
      navigation: 'immediate',
    });
  });

  return <DeckLayout />;
};

export const Multi: Story = {
  render: () => <MultiStory />,
};
