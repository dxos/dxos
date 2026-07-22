//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo, useRef } from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useAtomCapability, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppCapabilities, AppPlugin, LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { invariant } from '@dxos/invariant';
import { GraphBuilder, Node, NodeMatcher, useConnections } from '@dxos/plugin-graph';
import { corePlugins } from '@dxos/plugin-testing';
import { useAsyncEffect } from '@dxos/react-hooks';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';

import { OperationHandler } from '#capabilities';
import { useDeckState } from '#hooks';
import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';
import { DeckCapabilities, type EphemeralDeckState, type Settings, type StoredDeckState, defaultDeck } from '#types';

import { Deck } from './Deck';

type StoryItem = { id: string; title: string; icon: string };

const STORY_ITEMS: StoryItem[] = [
  { id: 'story-item-1', title: 'Overview', icon: 'ph--file-text--regular' },
  { id: 'story-item-2', title: 'Roadmap', icon: 'ph--map-trifold--regular' },
  { id: 'story-item-3', title: 'Notes', icon: 'ph--note--regular' },
  { id: 'story-item-4', title: 'Tasks', icon: 'ph--check-square--regular' },
  { id: 'story-item-5', title: 'References', icon: 'ph--bookmarks--regular' },
  { id: 'story-item-6', title: 'Archive', icon: 'ph--archive--regular' },
];

// In-memory deck settings so stories don't read/write the persisted plugin settings.
const storyDeckSettings = Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = Atom.make<Settings.Settings>({
      showHints: false,
      enableNativeRedirect: false,
      encapsulatedPlanks: true,
    }).pipe(Atom.keepAlive);

    return [Capability.contributes(DeckCapabilities.Settings, settingsAtom)];
  }),
);

// In-memory deck state so each story starts from a clean deck; the real `DeckState()` capability
// persists to localStorage, which otherwise leaks planks between stories.
const storyDeckState = Capability.makeModule(() =>
  Effect.sync(() => {
    const stateAtom = Atom.make<StoredDeckState>({
      sidebarState: 'closed',
      complementarySidebarState: 'closed',
      complementarySidebarPanel: undefined,
      activeDeck: 'default',
      previousDeck: 'default',
      decks: { default: { ...defaultDeck } },
    }).pipe(Atom.keepAlive);

    const ephemeralAtom = Atom.make<EphemeralDeckState>({
      fullscreen: undefined,
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
    }).pipe(Atom.keepAlive);

    const layoutAtom = Atom.make((get) => {
      const state = get(stateAtom);
      const ephemeral = get(ephemeralAtom);
      const deck = state.decks[state.activeDeck];
      invariant(deck, `Deck not found: ${state.activeDeck}`);
      return {
        variant: 'deck',
        fullscreen: !!ephemeral.fullscreen,
        dialogOpen: ephemeral.dialogOpen,
        sidebarOpen: state.sidebarState === 'expanded',
        complementarySidebarOpen: state.complementarySidebarState === 'expanded',
        workspace: state.activeDeck,
        active: deck.active,
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
            id: 'storyArticle',
            filter: Surface.makeFilter(AppSurface.Article),
            component: ({ data }) => {
              const subject = data.subject as StoryItem | undefined;
              const title = subject?.title ?? data.attendableId;
              return (
                <div className='grid content-start gap-2 p-4'>
                  <p className='text-sm text-description'>Story article surface</p>
                  <p>
                    Placeholder content for <span className='font-medium'>{title}</span> (
                    <span className='font-mono text-xs'>{data.attendableId}</span>).
                  </p>
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
                properties: { label: item.title, icon: item.icon },
              }),
            ),
          ),
      });
      return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
    }),
  }),
  Plugin.make,
);

// Fold-transition variants to compare, selected via the `foldAnimation` control and scoped by a
// `data-fold-anim` ancestor. `dx-fold-content` / `dx-fold-spine` are the hooks on the plank content and
// its book-spine sigil (see DeckViewport). `crossfade` is the deck's base (opacity swap on the elements
// themselves, matching the notes site); `slide` also slides the spine in from the leading edge.
const FOLD_ANIMATIONS = ['slide', 'crossfade'] as const;
type FoldAnimation = (typeof FOLD_ANIMATIONS)[number];

const FOLD_ANIMATION_CSS = `
[data-fold-anim='slide'] .dx-fold-spine {
  transition: opacity 200ms ease-out, transform 220ms ease-out;
  transform: translateX(-10px);
}
[data-fold-anim='slide'] [data-folded] .dx-fold-spine { transform: translateX(0); }
`;

type DefaultStoryProps = {
  /** Number of story planks to open on mount (0 renders the empty deck). */
  count?: number;
  /** Fold-transition variant to apply (see {@link FOLD_ANIMATIONS}). */
  foldAnimation?: FoldAnimation;
};

const DefaultStory = ({ count = 0, foldAnimation = 'slide' }: DefaultStoryProps) => {
  const settings = useAtomCapability(DeckCapabilities.Settings);
  const pluginManager = usePluginManager();
  const { graph } = useAppGraph();
  const { state, deck, updateState } = useDeckState();
  const { invokePromise } = useOperationInvoker();

  // Subscribe to the root's children so the `whenRoot` connector runs and materializes the story
  // nodes; without this each plank's `useNode` never resolves and the deck stays in the loading state.
  // The graph qualifies connector node ids with their parent path (e.g. `root/story-item-1`), so planks
  // must be opened by the materialized id rather than the bare `STORY_ITEMS` id.
  const rootChildren = useConnections(graph, Node.RootId, 'child');
  const items = useMemo(() => rootChildren.filter((node) => node.type === 'story-item'), [rootChildren]);

  const opened = useRef(false);
  useAsyncEffect(async () => {
    if (opened.current || (count > 0 && items.length < count)) {
      return;
    }
    opened.current = true;
    for (const [index, item] of items.slice(0, count).entries()) {
      await invokePromise(LayoutOperation.Open, {
        subject: [item.id],
        navigation: 'immediate',
        ...(index > 0 ? { disposition: 'new-plank' as const } : {}),
      });
    }
  }, [items, count]);

  // `display: contents` so the wrapper carries `data-fold-anim` for the scoped CSS without affecting the
  // fullscreen layout of the deck beneath it.
  return (
    <div className='contents' data-fold-anim={foldAnimation}>
      <style>{FOLD_ANIMATION_CSS}</style>
      <Deck.Root settings={settings} pluginManager={pluginManager} state={state} deck={deck} updateState={updateState}>
        <Deck.Content>
          <Deck.Viewport>{deck.active.length === 0 ? <Deck.ContentEmpty /> : <Deck.Planks />}</Deck.Viewport>
        </Deck.Content>
      </Deck.Root>
    </div>
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
  argTypes: {
    foldAnimation: { control: 'inline-radio', options: FOLD_ANIMATIONS },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

// A singleton `active` list renders fullbleed.
export const OnePlank: Story = { args: { count: 1 } };

// Two planks tile, splitting the width evenly with no horizontal overflow.
export const TwoPlanks: Story = { args: { count: 2 } };

// Six planks exceed the tiling threshold and render as a sliding, horizontally-scrolling deck.
// Use the `foldAnimation` control to compare fold transitions.
export const ManyPlanks: Story = { args: { count: 6, foldAnimation: 'slide' } };
