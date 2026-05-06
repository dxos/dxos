//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { forwardRef, useMemo } from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppCapabilities, AppNode, AppPlugin, LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph, useLayout } from '@dxos/app-toolkit/ui';
import { invariant } from '@dxos/invariant';
import { GraphBuilder, Node, NodeMatcher, useConnections } from '@dxos/plugin-graph';
import { corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useAsyncEffect } from '@dxos/react-hooks';
import { Icon, List, ListItem, Panel } from '@dxos/react-ui';
import { linkedSegment } from '@dxos/react-ui-attention';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { OperationHandler } from '#capabilities';
import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';
import {
  DeckCapabilities,
  type EphemeralDeckState,
  type Settings,
  type StoredDeckState,
  defaultDeck,
  getMode,
  PLANK_COMPANION_TYPE,
} from '#types';

import { DeckLayout } from './DeckLayout';

random.seed(1234);

// TODO(burdon): Show/hide companions.
// TODO(burdon): Companion width.

// TODO(burdon): Factor out.
const storyDeckSettings = Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = Atom.make<Settings.Settings>({
      showHints: false,
      enableDeck: true,
      enableStatusbar: false,
      enableNativeRedirect: false,
      encapsulatedPlanks: false,
    }).pipe(Atom.keepAlive);

    return [Capability.contributes(DeckCapabilities.Settings, settingsAtom)];
  }),
);

// TODO(burdon): Factor out.
const storyDeckState = Capability.makeModule(() =>
  Effect.sync(() => {
    const defaultStoredDeckState: StoredDeckState = {
      sidebarState: 'expanded',
      complementarySidebarState: 'collapsed',
      complementarySidebarPanel: undefined,
      activeDeck: 'default',
      previousDeck: 'default',
      previousMode: {},
      decks: {
        default: { ...defaultDeck },
      },
    };

    const stateAtom = Atom.make<StoredDeckState>({ ...defaultStoredDeckState }).pipe(Atom.keepAlive);

    const defaultEphemeralDeckState: EphemeralDeckState = {
      dialogContent: null,
      dialogOpen: false,
      dialogBlockAlign: undefined,
      dialogType: undefined,
      popoverContent: null,
      popoverAnchor: undefined,
      popoverAnchorId: undefined,
      popoverOpen: false,
      toasts: [],
      currentUndoId: undefined,
      scrollIntoView: undefined,
    };

    const ephemeralAtom = Atom.make<EphemeralDeckState>({ ...defaultEphemeralDeckState }).pipe(Atom.keepAlive);

    const layoutAtom = Atom.make((get) => {
      const state = get(stateAtom);
      const ephemeral = get(ephemeralAtom);
      const deck = state.decks[state.activeDeck];
      invariant(deck, `Deck not found: ${state.activeDeck}`);
      return {
        mode: getMode(deck),
        dialogOpen: ephemeral.dialogOpen,
        sidebarOpen: state.sidebarState === 'expanded',
        complementarySidebarOpen: state.complementarySidebarState === 'expanded',
        workspace: state.activeDeck,
        active: deck.solo ? [deck.solo] : deck.active,
        inactive: deck.inactive,
        scrollIntoView: ephemeral.scrollIntoView,
      } satisfies AppCapabilities.Layout;
    }).pipe(Atom.keepAlive);

    return [
      Capability.contributes(DeckCapabilities.State, stateAtom),
      Capability.contributes(DeckCapabilities.EphemeralState, ephemeralAtom),
      Capability.contributes(AppCapabilities.Layout, layoutAtom),
    ];
  }),
);

type Item = { id: string; title: string; children?: Item[] };

/**
 * @param depth - Current depth; children are only added when `depth < maxDepth`.
 * @param maxDepth - Defaults to {@link STORY_ITEM_MAX_DEPTH}.
 */
const createItem = (depth = 0, maxDepth = 3): Item => ({
  id: random.string.uuid(),
  title: random.lorem.words({ min: 2, max: 4 }),
  children:
    depth < maxDepth
      ? Array.from({ length: random.number.int({ min: 1, max: 8 }) }, () => createItem(depth + 1, maxDepth))
      : undefined,
});

const STORY_ITEMS = Array.from({ length: 5 }, () => createItem());

/**
 * Maps a nested {@link Item} tree to graph nodes so `Graph.getConnections` / `useConnections` see children.
 */
const toStoryItemNode = (item: Item, index: number, depth: number): Node.NodeArg<Item> =>
  Node.make({
    id: item.id,
    type: 'story-item',
    data: item,
    properties: {
      label: depth === 0 ? `Item ${index + 1}` : item.title,
      icon: depth === 0 ? 'ph--file--regular' : 'ph--file-text--regular',
    },
    nodes: (item.children ?? []).map((child, childIndex) => toStoryItemNode(child, childIndex, depth + 1)),
  });

const TestPlugin = Plugin.define(pluginMeta).pipe(
  Plugin.addModule({
    id: 'story-deck-settings',
    activatesOn: AppActivationEvents.SetupSettings,
    activate: storyDeckSettings,
  }),
  Plugin.addModule({
    id: 'story-deck-state',
    activatesOn: AppActivationEvents.AppGraphReady,
    activate: storyDeckState,
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
            component: ({ data, ref }) => <NavContainer current={data.current} ref={ref} />,
          }),
          Surface.create({
            id: 'story-article',
            role: 'article',
            filter: (data): data is Record<string, unknown> =>
              typeof data === 'object' && data !== null && (data as { companionTo?: unknown }).companionTo == null,
            component: ({ data }) => {
              const subject = (data as any)?.subject;
              const attendableId = (data as any)?.attendableId as string | undefined;
              if (subject == null) {
                return <Loading />;
              }

              return (
                <Panel.Root>
                  <Panel.Content className='grid grid-rows-[min-content_1fr]'>
                    {attendableId && <ItemComponent id={attendableId} />}
                    <Syntax.Root data={subject}>
                      <Syntax.Content>
                        <Syntax.Filter />
                        <Syntax.Viewport>
                          <Syntax.Code />
                        </Syntax.Viewport>
                      </Syntax.Content>
                    </Syntax.Root>
                  </Panel.Content>
                </Panel.Root>
              );
            },
          }),
          Surface.create({
            id: 'story-article-companion',
            role: 'article',
            filter: (data): data is AppSurface.ArticleData<unknown, {}, unknown> =>
              typeof data === 'object' && data !== null && (data as { companionTo?: unknown }).companionTo != null,
            component: ({ data: { subject, companionTo, properties, variant } }) => {
              if (companionTo == null) {
                return <Loading />;
              }

              return (
                <Syntax.Root
                  data={{
                    primaryItem: companionTo,
                    companion: { data: subject, properties, variant },
                  }}
                >
                  <Syntax.Content>
                    <Syntax.Viewport>
                      <Syntax.Code />
                    </Syntax.Viewport>
                  </Syntax.Content>
                </Syntax.Root>
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
          connector: () => Effect.succeed(STORY_ITEMS.map((item, index) => toStoryItemNode(item, index, 0))),
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

type NavContainerProps = {
  current?: string;
};

const NavContainer = forwardRef<HTMLDivElement, NavContainerProps>((_props, forwardedRef) => {
  const { graph } = useAppGraph();
  const layout = useLayout();
  const { invokePromise } = useOperationInvoker();

  const items = useConnections(graph, Node.RootId, 'child');
  const activeSet = useMemo(() => new Set(layout.active), [layout.active]);

  return (
    <div className='dx-container overflow-y-auto p-2' ref={forwardedRef}>
      <List>
        {items.map((node) => (
          <ListItem.Root
            key={node.id}
            classNames={activeSet.has(node.id) ? 'bg-active-surface' : undefined}
            onClick={() => void invokePromise(LayoutOperation.Set, { subject: [node.id] })}
          >
            {node.properties.icon && (
              <ListItem.Endcap>
                <Icon icon={node.properties.icon} />
              </ListItem.Endcap>
            )}
            <ListItem.Heading classNames='cursor-pointer'>
              {typeof node.properties.label === 'string' ? node.properties.label : node.id}
            </ListItem.Heading>
          </ListItem.Root>
        ))}
      </List>
    </div>
  );
});

type ItemComponentProps = {
  id: string;
};

const ItemComponent = ({ id }: ItemComponentProps) => {
  const { graph } = useAppGraph();
  const { invokePromise } = useOperationInvoker();
  const connections = useConnections(graph, id, 'child');
  const items = useMemo(
    () => connections.filter((node) => !Node.isActionLike(node) && node.type !== PLANK_COMPANION_TYPE),
    [connections],
  );

  return (
    <List>
      {items.map((node) => {
        const open = () =>
          void invokePromise(LayoutOperation.Open, { subject: [node.id], pivotId: id, navigation: 'immediate' });
        return (
          <ListItem.Root
            key={node.id}
            classNames='dx-hover cursor-pointer'
            role='button'
            tabIndex={0}
            onClick={open}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                open();
              }
            }}
          >
            {node.properties.icon && (
              <ListItem.Endcap>
                <Icon icon={node.properties.icon} size={4} />
              </ListItem.Endcap>
            )}
            <ListItem.Heading classNames='truncate'>
              {typeof node.properties.label === 'string' ? node.properties.label : node.id}
            </ListItem.Heading>
          </ListItem.Root>
        );
      })}
    </List>
  );
};

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

export const Solo: Story = {
  render: () => {
    const { invokePromise } = useOperationInvoker();
    useAsyncEffect(async () => {
      await invokePromise(LayoutOperation.Open, { subject: [STORY_ITEMS[0].id], navigation: 'immediate' });
      await invokePromise(LayoutOperation.SetLayoutMode, { mode: 'solo', subject: STORY_ITEMS[0].id });
    });

    return <DeckLayout />;
  },
};

export const Multi: Story = {
  render: () => {
    const { invokePromise } = useOperationInvoker();
    useAsyncEffect(async () => {
      await invokePromise(LayoutOperation.Open, { subject: [STORY_ITEMS[0].id], navigation: 'immediate' });
      await invokePromise(LayoutOperation.SetLayoutMode, { mode: 'multi' });
    });

    return <DeckLayout />;
  },
};
