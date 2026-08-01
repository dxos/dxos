//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useMemo, useRef } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useAtomCapability, usePluginManager } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppCapabilities, AppNode, AppPlugin } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { invariant } from '@dxos/invariant';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { useConnections } from '@dxos/plugin-graph/hooks';
import { corePlugins } from '@dxos/plugin-testing';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { Position, trim } from '@dxos/util';

import { OperationHandler } from '#capabilities';
import { useDeckState } from '#hooks';
import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';
import {
  DeckCapabilities,
  type EphemeralDeckState,
  type Settings,
  type StoredDeckState,
  defaultDeck,
  getMode,
} from '#types';

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
        mode: getMode(deck, !!ephemeral.fullscreen),
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
            filter: Surface.makeFilter(AppSurface.Article, (data) => data.companionTo == null),
            component: ({ data }) => {
              const subject = data.subject as StoryItem | undefined;
              const title = subject?.title ?? data.attendableId;
              return (
                <div className='grid content-start gap-2 p-4' data-testid='story.article' data-title={title}>
                  <p className='text-sm text-description'>Story article surface</p>
                  <p>
                    Placeholder content for <span className='font-medium'>{title}</span> (
                    <span className='font-mono text-xs'>{data.attendableId}</span>).
                  </p>
                </div>
              );
            },
          }),
          Surface.create({
            id: 'storyArticleCompanion',
            filter: Surface.makeFilter(AppSurface.Article, (data) => data.companionTo != null),
            component: ({ data }) => {
              const companionTo = data.companionTo as StoryItem | undefined;
              return (
                <div
                  className='grid content-start gap-2 p-4'
                  data-testid='story.companion'
                  data-companion-to={companionTo?.title}
                >
                  <p className='text-sm text-description'>Story companion surface</p>
                  <p>
                    Companion <span className='font-mono text-xs'>{String(data.variant)}</span> of{' '}
                    <span className='font-medium'>{companionTo?.title ?? data.attendableId}</span>.
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
      const extensions = yield* Effect.all([
        GraphBuilder.createExtension({
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
        }),
        // Every story plank carries the same two companions, so the companion can be watched moving from
        // plank to plank as attention changes.
        GraphBuilder.createExtension({
          id: 'storyItemCompanions',
          match: NodeMatcher.whenNodeType('story-item'),
          connector: (node) =>
            Effect.succeed([
              AppNode.makeCompanion({
                variant: 'alpha',
                label: 'Companion Alpha',
                icon: 'ph--sidebar--regular',
                data: { variant: 'alpha', parentId: node.id },
                position: Position.first,
              }),
              AppNode.makeCompanion({
                variant: 'beta',
                label: 'Companion Beta',
                icon: 'ph--chat-circle--regular',
                data: { variant: 'beta', parentId: node.id },
              }),
            ]),
        }),
      ]);
      return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions.flat());
    }),
  }),
  Plugin.make,
);

// Fold-transition variants to compare, selected via the `foldAnimation` control and scoped by a
// `data-fold-anim` ancestor. `dx-fold-content` / `dx-fold-spine` are the hooks on the plank content and
// its book-spine sigil, and `data-fold-side` (start|end) is the pile the plank pinned to (see
// DeckViewport). `crossfade` is the deck's base (opacity swap on the elements themselves, matching the
// notes site); `slide` also slides the spine in along the plank's own travel — from the trailing side in
// the left pile, from the leading side in the right pile — so the motion tracks the scroll direction.
const FOLD_ANIMATIONS = ['slide', 'crossfade'] as const;
type FoldAnimation = (typeof FOLD_ANIMATIONS)[number];

// TODO(burdon): Why in story?
const FOLD_ANIMATION_CSS = trim`
  [data-fold-anim='slide'] .dx-fold-spine {
    transition: opacity 200ms ease-out, transform 220ms ease-out;
  }
  [data-fold-anim='slide'] [data-fold-side='start'] .dx-fold-spine { transform: translateX(10px); }
  [data-fold-anim='slide'] [data-fold-side='end'] .dx-fold-spine { transform: translateX(-10px); }
  [data-fold-anim='slide'] [data-folded] .dx-fold-spine { transform: translateX(0); }
`;

type DefaultStoryProps = {
  /** Number of story planks to open on mount (0 renders the empty deck). */
  count?: number;
  /** Fold-transition variant to apply (see {@link FOLD_ANIMATIONS}). */
  foldAnimation?: FoldAnimation;
  /** Navigation sidebar state to seed. `closed` is only reachable below `lg`. */
  sidebarState?: StoredDeckState['sidebarState'];
  /**
   * Which planks open with their companion showing, as 1-based positions. The companion is per plank,
   * so `[1]` leaves every other plank closed until you open it there.
   */
  companionPlanks?: number[];
};

// Stable identity, so the default does not re-fire the seeding effect it is a dependency of on every render.
const NO_COMPANIONS: number[] = [];

const DefaultStory = ({
  count = 0,
  foldAnimation = 'slide',
  sidebarState = 'closed',
  companionPlanks = NO_COMPANIONS,
}: DefaultStoryProps) => {
  const settings = useAtomCapability(DeckCapabilities.Settings);
  const pluginManager = usePluginManager();
  const { graph } = useAppGraph();
  const { state, deck, updateState } = useDeckState();

  // Subscribe to the root's children so the `whenRoot` connector runs and materializes the story
  // nodes; without this each plank's `useNode` never resolves and the deck stays in the loading state.
  // The graph qualifies connector node ids with their parent path (e.g. `root/story-item-1`), so the
  // seeded `active` list holds the materialized ids rather than the bare `STORY_ITEMS` ids.
  const rootChildren = useConnections(graph, Node.RootId, 'child');
  const items = useMemo(() => rootChildren.filter((node) => node.type === 'story-item'), [rootChildren]);

  // Seed the deck's active planks in one shot rather than opening them one by one: each `Open` schedules
  // its own scroll-into-view, so a multi-plank deck would visibly page from plank to plank on load.
  // Seeding `active` directly mounts every plank in place with no scrolling.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || (count > 0 && items.length < count)) {
      return;
    }
    seeded.current = true;
    const active = items.slice(0, count).map((item) => item.id);
    const open = companionPlanks.map((position) => active[position - 1]).filter((id): id is string => !!id);
    updateState((current) => ({
      ...current,
      sidebarState,
      decks: {
        ...current.decks,
        [current.activeDeck]: { ...current.decks[current.activeDeck], active, companionPlanks: open },
      },
    }));
  }, [items, count, sidebarState, companionPlanks, updateState]);

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
export const OnePlank: Story = {
  args: {
    count: 1,
  },
};

// Two planks tile, splitting the width evenly with no horizontal overflow.
export const TwoPlanks: Story = {
  args: {
    count: 2,
  },
};

// Six planks exceed the tiling threshold and render as a sliding, horizontally-scrolling deck.
// Use the `foldAnimation` control to compare fold transitions.
export const ManyPlanks: Story = {
  args: {
    count: 6,
    foldAnimation: 'slide',
  },
};

// A lone plank stays fullbleed with its companion open; the pair fills the viewport across the seam.
export const OnePlankWithCompanion: Story = {
  args: {
    count: 1,
    companionPlanks: [1],
  },
};

// The companion shares a container with the attended plank, and each plank remembers whether its own
// companion is open — here planks 1 and 3 start open, planks 2 and 4 closed.
//
// Test:
// 1. Confirm the companion sits inside the first plank's container, immediately to its right.
// 2. Click the second plank; confirm it shows NO companion, and the planks after it fold to spines.
// 3. Click the third plank; confirm its companion is showing again.
// 4. Close the companion on the third plank, then return to the first; confirm the first is still open.
// 5. Drag the seam between a plank and its companion; confirm only those two panes resize, and that
//    closing the companion afterwards leaves the plank at the width you dragged it to.
export const ManyPlanksWithCompanion: Story = {
  args: {
    count: 4,
    companionPlanks: [1, 3],
  },
};

/** Attends a plank by focusing it — attention is focus-driven, and a click would have to land on a plank that may be folded. */
const attendPlank = async (canvasElement: HTMLElement, position: number) => {
  const id = `root/story-item-${position}`;
  const plank = canvasElement.querySelector<HTMLElement>(`[data-testid="deck.plank"][data-attendable-id="${id}"]`);
  await expect(plank, `no plank for ${id}`).not.toBeNull();
  plank?.focus();
};

/**
 * Titles of the planks whose companion is currently rendered (the story companion surface stamps its
 * own). Deduped: `Companion` keeps every variant's panel mounted, hiding the inactive ones, so a single
 * showing companion contributes one surface per variant.
 */
const showingCompanionsFor = (canvasElement: HTMLElement): string[] => [
  ...new Set(
    Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-testid="story.companion"]'))
      .map((element) => element.dataset.companionTo)
      .filter((title): title is string => !!title),
  ),
];

// The companion belongs to a plank, not to the deck: it follows attention from plank to plank, and each
// plank remembers whether its own is open. Planks 1 and 3 start open here, plank 2 closed.
export const CompanionFollowsAttention: Story = {
  tags: ['test'],
  args: { count: 3, companionPlanks: [1, 3] },
  play: async ({ canvasElement }) => {
    // The plugin manager activates asynchronously, so the deck mounts well after the story's first paint.
    const canvas = within(canvasElement);
    await canvas.findAllByTestId('story.article', {}, { timeout: 30_000 });

    // Nothing is attended yet, so the companion falls back to the last plank — which has its own open.
    await waitFor(() => expect(showingCompanionsFor(canvasElement)).toEqual(['Notes']));

    // Plank 2 was left closed, so attending it shows no companion at all.
    await attendPlank(canvasElement, 2);
    await waitFor(() => expect(showingCompanionsFor(canvasElement)).toEqual([]));

    // Plank 1 was left open, so returning to it brings its companion back.
    await attendPlank(canvasElement, 1);
    await waitFor(() => expect(showingCompanionsFor(canvasElement)).toEqual(['Overview']));
  },
};

// A `closed` sidebar persisted from below `lg` (dismissing the drawer) must present as the L0 rail at
// `lg`+, where `closed` would otherwise render L0 off-screen and inert with every control that could
// reopen it either `lg:hidden` or inside L0 itself.
export const SidebarClosedAtDesktop: Story = {
  tags: ['test'],
  args: { count: 1, sidebarState: 'closed' },
  play: async ({ canvasElement }) => {
    // The regression only exists at `lg`+, so a narrower canvas would make every assertion below pass
    // vacuously.
    await expect(window.innerWidth).toBeGreaterThanOrEqual(1024);

    // The plugin manager activates asynchronously, so the deck mounts well after the story's first paint.
    const sidebar = await within(canvasElement).findByTestId('deck.sidebar', {}, { timeout: 30_000 });
    await waitFor(() => expect(sidebar).toHaveAttribute('data-state', 'collapsed'));
    await expect(sidebar).not.toHaveAttribute('inert');

    // `closed` parks the sidebar at `-start-[100vw]`; the rail has to be on screen to be usable.
    await expect(sidebar.getBoundingClientRect().left).toBeGreaterThanOrEqual(0);
  },
};
