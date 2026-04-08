//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppCapabilities, AppNode, AppPlugin, LayoutOperation } from '@dxos/app-toolkit';
import { Node, GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { linkedSegment } from '@dxos/react-ui-attention';
import { corePlugins } from '@dxos/plugin-testing';
import { useAsyncEffect } from '@dxos/react-hooks';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { meta as pluginMeta } from '#meta';
import { DeckLayoutStoryNavigationRail, DeckLayoutStoryPlankOpenList } from '#testing';

import { translations } from '../../translations';

import { DeckLayout } from './DeckLayout';

import { DeckState, OperationHandler } from '#capabilities';
import { DeckOperation } from '#operations';
import { DeckCapabilities, type Settings } from '#types';

/**
 * Same as {@link DeckSettings} but with `enableDeck: true`.
 * Prevents `DeckContent` from forcing solo whenever layout is multi when `!settings.enableDeck`.
 */
const storyDeckSettings = Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = Atom.make<Settings.Settings>({
      showHints: false,
      enableDeck: true,
      enableStatusbar: false,
      enableNativeRedirect: false,
      encapsulatedPlanks: true,
    }).pipe(Atom.keepAlive);

    return [Capability.contributes(DeckCapabilities.Settings, settingsAtom)];
  }),
);

const STORY_ITEM_SEGMENTS = ['story-a', 'story-b', 'story-c', 'story-d', 'story-e'];
const STORY_ITEMS = STORY_ITEM_SEGMENTS.map((id) => `${Node.RootId}/${id}`);

const TestPlugin = Plugin.define(pluginMeta).pipe(
  Plugin.addModule({
    id: 'story-deck-settings',
    activatesOn: AppActivationEvents.SetupSettings,
    activate: storyDeckSettings,
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
            component: ({ data, ref }) => <DeckLayoutStoryNavigationRail current={data.current} ref={ref} />,
          }),
          Surface.create({
            id: 'story-article-companion',
            role: 'article',
            filter: (data): data is Record<string, unknown> =>
              typeof data === 'object' &&
              data !== null &&
              (data as { companionTo?: unknown }).companionTo != null,
            component: ({ data }) => {
              const subject = (data as any)?.subject;
              const companionTo = (data as any)?.companionTo;
              const properties = (data as any)?.properties;
              const variant = (data as any)?.variant as string | undefined;

              if (companionTo == null) {
                return <Loading />;
              }

              const jsonPayload = {
                primaryItem: companionTo,
                companion: { data: subject, properties, variant },
              };

              return (
                <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
                  <div className='min-h-0 min-w-0 flex-1 overflow-auto'>
                    <Json.Root data={jsonPayload}>
                      <Json.Content>
                        <Json.Data />
                      </Json.Content>
                    </Json.Root>
                  </div>
                </div>
              );
            },
          }),
          Surface.create({
            id: 'story-article',
            role: 'article',
            filter: (data): data is Record<string, unknown> =>
              typeof data === 'object' &&
              data !== null &&
              (data as { companionTo?: unknown }).companionTo == null,
            component: ({ data }) => {
              const subject = (data as any)?.subject;
              const attendableId = (data as any)?.attendableId as string | undefined;

              if (subject == null) {
                return <Loading />;
              }

              return (
                <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
                  {attendableId && <DeckLayoutStoryPlankOpenList pivotId={attendableId} />}
                  <div className='min-h-0 min-w-0 flex-1 overflow-auto'>
                    <Json.Root data={subject}>
                      <Json.Content>
                        <Json.Data />
                      </Json.Content>
                    </Json.Root>
                  </div>
                </div>
              );
            },
          }),
        ]),
      ),
  }),
  AppPlugin.addAppGraphModule({
    id: 'story-graph',
    activate: Effect.fnUntraced(function* () {
      const extensions = yield* Effect.all([
        GraphBuilder.createExtension({
          id: 'story-items',
          match: NodeMatcher.whenRoot,
          connector: () =>
            Effect.succeed(
              STORY_ITEM_SEGMENTS.map((id, index) => ({
                id,
                type: 'story-item',
                data: { id, title: `Story Item ${index + 1}` },
                properties: {
                  label: `Item ${index + 1}`,
                  icon: 'ph--file--regular',
                },
              })),
            ),
        }),
        GraphBuilder.createExtension({
          id: 'story-item-companions',
          match: NodeMatcher.whenNodeType('story-item'),
          connector: (node) =>
            Effect.succeed([
              AppNode.makeCompanion({
                id: linkedSegment('alpha'),
                label: 'Companion Alpha',
                icon: 'ph--sidebar--regular',
                data: { variant: 'alpha', parentId: node.id },
                position: 'hoist',
              }),
              AppNode.makeCompanion({
                id: linkedSegment('beta'),
                label: 'Companion Beta',
                icon: 'ph--chat-circle--regular',
                data: { variant: 'beta', parentId: node.id },
                position: 'static',
              }),
            ]),
        }),
      ]);
      return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions.flat());
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
    await invokePromise(LayoutOperation.Open, { subject: [STORY_ITEMS[0]], navigation: 'immediate' });
    await invokePromise(LayoutOperation.SetLayoutMode, { mode: 'multi' });
    await invokePromise(LayoutOperation.Set, {
      subject: [STORY_ITEMS[0], STORY_ITEMS[1], STORY_ITEMS[2]],
    });
    const lastPlankId = STORY_ITEMS[2];
    await invokePromise(DeckOperation.ChangeCompanion, {
      companion: `${lastPlankId}/${linkedSegment('alpha')}`,
    });
  });

  return <DeckLayout />;
};

export const Multi: Story = {
  render: () => <MultiStory />,
};
