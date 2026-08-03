//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useAtomCapabilityState, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { AppCapabilities, AppNode, LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { invariant } from '@dxos/invariant';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';
import { useConnections } from '@dxos/plugin-graph/hooks';
import { corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useThemeContext } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  documentSlots,
} from '@dxos/ui-editor';
import { Position } from '@dxos/util';

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

// Seeded, so every plank's content is the same on each run — a plank that regenerated its text would
// change height and make the deck's scroll and fold geometry irreproducible between runs.
random.seed(1234);

/** Markdown long enough that a plank scrolls, so the deck is exercised against real article content. */
const generateContent = (title: string): string =>
  [
    `# ${title}`,
    ...Array.from({ length: 8 }, (_, index) =>
      index % 3 === 2
        ? `## ${random.lorem.words(3)}\n\n${random.lorem.paragraph()}`
        : random.lorem.paragraphs(2).replaceAll('\n', '\n\n'),
    ),
  ].join('\n\n');

/** Generated once per title up front, so a re-render never redraws from the shared seeded generator. */
const STORY_CONTENT: Record<string, string> = Object.fromEntries(
  STORY_ITEMS.map((item) => [item.title, generateContent(item.title)]),
);

const contentFor = (title: string): string => STORY_CONTENT[title] ?? `# ${title}`;

/**
 * A plank's article: a real markdown editor rather than placeholder copy, so the deck is exercised
 * against content that scrolls, holds focus and competes for the plank's height. The testid lives on
 * the container because `Editor.View` renders its own div and drops unknown props.
 */
const TestArticle = ({ title, content }: { title: string; content: string }) => {
  const { themeMode } = useThemeContext();
  const extensions = useMemo(
    () => [
      createBasicExtensions(),
      createThemeExtensions({ themeMode, slots: documentSlots }),
      createMarkdownExtensions(),
      decorateMarkdown(),
    ],
    [themeMode],
  );

  return (
    <Editor.Root>
      <div className='contents' data-testid='story.article' data-title={title}>
        <Editor.View value={content} extensions={extensions} classNames='dx-container' />
      </div>
    </Editor.Root>
  );
};

//
// Launcher fixture — reproduces the app shape the plain stories miss: a plank whose *content* opens
// another plank (the mailbox's message list). Every collision between an in-deck click and the
// navigation it triggers lives on this path, and none of the editor-only stories exercise it.
//

const LAUNCHER_ID = 'story-launcher';
const LAUNCHER_MESSAGES = Array.from({ length: 4 }, (_, index) => ({
  id: `story-message-${index + 1}`,
  title: `Message ${index + 1}`,
  icon: 'ph--envelope--regular',
}));

const TestLauncher = ({ launcherId }: { launcherId: string }) => {
  const { invokePromise } = useOperationInvoker();
  // Selection state, so a click re-renders the launcher's own subtree the way the mailbox list does.
  const [selected, setSelected] = useState<string | undefined>(undefined);

  const handleOpen = useCallback(
    (messageId: string) => {
      setSelected(messageId);
      // The exact shape MailboxArticle dispatches: a level-open relative to this plank as the root.
      void invokePromise(LayoutOperation.Open, {
        subject: [`${launcherId}/${messageId}`],
        root: launcherId,
        level: 'message',
        disposition: 'add',
        navigation: 'immediate',
      });
    },
    [invokePromise, launcherId],
  );

  return (
    <div className='grid content-start gap-1 p-2' data-testid='story.launcher'>
      {LAUNCHER_MESSAGES.map((message) => (
        <button
          key={message.id}
          className='rounded-sm border border-separator p-3 text-start hover:bg-hoverSurface'
          data-testid='story.launcher.row'
          data-selected={selected === message.id}
          onClick={() => handleOpen(message.id)}
        >
          {message.title}
        </button>
      ))}
    </div>
  );
};

// In-memory deck settings so stories don't read/write the persisted plugin settings.
const storyDeckSettings = Capability.makeModule(() =>
  Effect.sync(() => {
    const settingsAtom = Atom.make<Settings.Settings>({
      showHints: false,
      enableNativeRedirect: false,
    }).pipe(Atom.keepAlive);

    return [Capability.contribute(DeckCapabilities.Settings, settingsAtom)];
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
      Capability.contribute(DeckCapabilities.State, stateAtom),
      Capability.contribute(DeckCapabilities.EphemeralState, ephemeralAtom),
      Capability.contribute(AppCapabilities.Layout, layoutAtom),
    ];
  }),
);

const TestPlugin = Plugin.define(pluginMeta).pipe(
  Plugin.addModule({
    id: 'story-deck-settings',
    provides: [DeckCapabilities.Settings],
    activate: storyDeckSettings,
  }),
  Plugin.addModule({
    id: 'story-deck-state',
    provides: [DeckCapabilities.State, DeckCapabilities.EphemeralState, AppCapabilities.Layout],
    activate: storyDeckState,
  }),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(
    Capability.inlineModule('story-surfaces', { provides: [Capabilities.ReactSurface] }, () =>
      Effect.succeed(
        Capability.contribute(Capabilities.ReactSurface, [
          Surface.create({
            id: 'storyLauncher',
            filter: Surface.makeFilter(
              AppSurface.Article,
              (data) =>
                data.companionTo == null && (data.subject as { launcher?: boolean } | undefined)?.launcher === true,
            ),
            component: ({ data }) => <TestLauncher launcherId={String(data.attendableId)} />,
          }),
          Surface.create({
            id: 'storyArticle',
            filter: Surface.makeFilter(
              AppSurface.Article,
              (data) =>
                data.companionTo == null && (data.subject as { launcher?: boolean } | undefined)?.launcher !== true,
            ),
            component: ({ data }) => {
              const subject = data.subject as StoryItem | undefined;
              const title = subject?.title ?? String(data.attendableId);
              return <TestArticle title={title} content={contentFor(title)} />;
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
    ),
  ),
  Plugin.addModule(
    Capability.inlineModule(
      'story-graph',
      { provides: [AppCapabilities.AppGraphBuilder] },
      Effect.fnUntraced(function* () {
        const extensions = yield* Effect.all([
          GraphBuilder.createExtension({
            id: 'storyItems',
            match: NodeMatcher.whenRoot,
            connector: () =>
              Effect.succeed([
                ...STORY_ITEMS.map((item) =>
                  Node.make({
                    id: item.id,
                    type: 'story-item',
                    data: item,
                    properties: { label: item.title, icon: item.icon },
                  }),
                ),
                // The launcher declares its chain on the node, the way the app resolves it off the type.
                Node.make({
                  id: LAUNCHER_ID,
                  type: 'story-launcher',
                  data: { id: LAUNCHER_ID, title: 'Inbox', launcher: true },
                  properties: {
                    label: 'Inbox',
                    icon: 'ph--tray--regular',
                    deck: { levels: [{ key: 'list' }, { key: 'message' }] },
                  },
                }),
              ]),
          }),
          GraphBuilder.createExtension({
            id: 'storyLauncherMessages',
            match: NodeMatcher.whenNodeType('story-launcher'),
            connector: () =>
              Effect.succeed(
                LAUNCHER_MESSAGES.map((message) =>
                  Node.make({
                    id: message.id,
                    type: 'story-message',
                    data: message,
                    properties: { label: message.title, icon: message.icon },
                  }),
                ),
              ),
          }),
          // Every story plank carries the same two companions, so the companion can be watched moving from
          // plank to plank as attention changes.
          GraphBuilder.createExtension({
            id: 'storyItemCompanions',
            match: (node) =>
              node.type === 'story-item' || node.type === 'story-message' ? Option.some(node) : Option.none(),
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
        return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions.flat());
      }),
    ),
  ),
  Plugin.make,
);

type DefaultStoryProps = {
  /** Number of story planks to open on mount (0 renders the empty deck). */
  count?: number;
  /** Navigation sidebar state to seed. `closed` is only reachable below `lg`. */
  sidebarState?: StoredDeckState['sidebarState'];
  /** Which planks open with their companion showing, as 1-based positions. */
  companionPlanks?: number[];
  /** Open the launcher fixture as the first plank (the mailbox-shaped path). */
  launcher?: boolean;
  /**
   * Layout experiments to switch on (see `Settings`). They are settings rather than props, so the story
   * seeds them into the settings atom the deck actually reads.
   */
  settings?: Partial<Pick<Settings.Settings, 'flatten' | 'overscroll'>>;
};

/** Stable identity, for the same reason as `NO_COMPANIONS`. */
const NO_SETTINGS: DefaultStoryProps['settings'] = {};

// Stable identity, so the default does not re-fire the seeding effect it is a dependency of on every render.
const NO_COMPANIONS: number[] = [];

const DefaultStory = ({
  count = 0,
  sidebarState = 'closed',
  companionPlanks = NO_COMPANIONS,
  launcher = false,
  settings: settingsOverrides = NO_SETTINGS,
}: DefaultStoryProps) => {
  const [settings, updateSettings] = useAtomCapabilityState(DeckCapabilities.Settings);

  // The deck reads its experiments from settings, not from props, so the story writes them there.
  useEffect(() => {
    updateSettings((current) => ({ ...current, ...settingsOverrides }));
  }, [settingsOverrides, updateSettings]);
  const pluginManager = usePluginManager();
  const { graph } = useAppGraph();
  const { state, deck, updateState } = useDeckState();

  // Subscribe to the root's children so the `whenRoot` connector runs and materializes the story
  // nodes; without this each plank's `useNode` never resolves and the deck stays in the loading state.
  // The graph qualifies connector node ids with their parent path (e.g. `root/story-item-1`), so the
  // seeded `active` list holds the materialized ids rather than the bare `STORY_ITEMS` ids.
  const rootChildren = useConnections(graph, Node.RootId, 'child');
  const items = useMemo(() => rootChildren.filter((node) => node.type === 'story-item'), [rootChildren]);
  const launcherNode = useMemo(() => rootChildren.find((node) => node.type === 'story-launcher'), [rootChildren]);

  // Seed the deck's active planks in one shot rather than opening them one by one: each `Open` schedules
  // its own scroll-into-view, so a multi-plank deck would visibly page from plank to plank on load.
  // Seeding `active` directly mounts every plank in place with no scrolling.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || (count > 0 && items.length < count) || (launcher && !launcherNode)) {
      return;
    }
    seeded.current = true;
    const active = [
      ...(launcher && launcherNode ? [launcherNode.id] : []),
      ...items.slice(0, count).map((item) => item.id),
    ];
    const open = companionPlanks.map((position) => active[position - 1]).filter((id): id is string => !!id);
    updateState((current) => ({
      ...current,
      sidebarState,
      decks: {
        ...current.decks,
        [current.activeDeck]: { ...current.decks[current.activeDeck], active, companionPlanks: open },
      },
    }));
  }, [items, count, sidebarState, companionPlanks, launcher, launcherNode, updateState]);

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
  },
};

// `overscroll`: the deck keeps scrolling once the last plank reaches the right edge, so Archive can be
// brought fully forward with the other five collapsed to spines and empty space beside it.
export const ManyPlanksOverscroll: Story = {
  args: {
    count: 6,
    settings: {
      overscroll: true,
    },
  },
};

// A lone plank stays fullbleed with its companion open; the pair fills the viewport across the seam.
export const OnePlankWithCompanion: Story = {
  args: {
    count: 1,
    companionPlanks: [1],
  },
};

// Each plank remembers whether its own companion is open, and every open companion renders beside its
// own plank — here planks 1 and 3 start open, planks 2 and 4 closed.
//
// Test:
// 1. Confirm companions sit inside the first and third planks' containers, immediately to their right.
// 2. Click the second plank; confirm it shows no companion of its own and the deck does not move.
// 3. Close the companion on the third plank; confirm the first plank's is untouched.
// 4. Reopen it from the third plank's toolbar; confirm neither plank moves.
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

// Companions are per-plank state: every plank whose companion is open renders it beside that plank, and
// attention plays no part in what is laid out. Planks 1 and 3 start open here, plank 2 closed. (This
// replaces the follows-attention model, whose re-anchoring resized tiles on attention traffic and let
// the engine silently shift the deck's scroll.)
export const CompanionPerPlank: Story = {
  tags: ['test'],
  args: { count: 3, companionPlanks: [1, 3] },
  play: async ({ canvasElement }) => {
    // The plugin manager activates asynchronously, so the deck mounts well after the story's first paint.
    const canvas = within(canvasElement);
    await canvas.findAllByTestId('story.article', {}, { timeout: 30_000 });

    // Both open companions render, each beside its own plank, before anything is attended.
    await waitFor(() => expect(showingCompanionsFor(canvasElement)).toEqual(['Overview', 'Notes']));

    // Attending the companion-less plank must not change what is laid out — under the old model this
    // re-anchored the companion and emptied the deck of companions entirely. The settle delay is the
    // regression net: the old behavior re-rendered within a commit, so still-visible after it means
    // attention no longer drives layout.
    await attendPlank(canvasElement, 2);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(showingCompanionsFor(canvasElement)).toEqual(['Overview', 'Notes']);

    await attendPlank(canvasElement, 1);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await expect(showingCompanionsFor(canvasElement)).toEqual(['Overview', 'Notes']);
  },
};

/**
 * The mailbox-shaped path: a launcher plank whose rows level-open a message plank beside it.
 *
 * Test:
 * 1. Click a row in the Inbox plank — exactly one smooth scroll brings the message plank forward; the
 *    deck must not lurch toward the launcher first or bounce back after.
 * 2. Click a different row — the message plank is reused in place (no third plank), no scroll at all if
 *    it is already front.
 * 3. Open the message plank's companion from its toolbar — neither plank moves.
 * 4. Repeat 1–3 quickly — no jitter; the deck never travels twice for one click.
 */
export const LauncherManual: Story = {
  args: { launcher: true },
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
