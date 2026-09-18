//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as FiberHandle from 'effect/FiberHandle';
import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useAtomCapabilityState, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import * as UrlPath from '@dxos/app-toolkit/UrlPath';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { invariant } from '@dxos/invariant';
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
import { DeckCapabilities, DeckSchema, Settings } from '#types';

import { Deck } from './Deck.tsx';

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
 * The graph's single workspace level: every story node hangs off `root/<workspace>` rather than
 * directly off root, matching the `root/<workspace>/<id>` shape `PathResolution.representNode`
 * requires to round-trip `LayoutOperation.Open` through the URL (a bare `root/<id>` node has no
 * workspace segment and so has no URL binding).
 */
const STORY_WORKSPACE_ID = `${GraphNode.RootId}/${DeckSchema.DEFAULT_DECK_ID}`;

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
        <Editor.View value={content} extensions={extensions} classNames='dx-expand' />
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

const REVEAL_PLANK_ID = `${STORY_WORKSPACE_ID}/story-item-5`;

/** Reveals a plank from outside the deck, and marks the button once the deck's effects have run. */
const TestRevealControls = () => {
  const { invokePromise } = useOperationInvoker();
  const reveal = useCallback(
    async (button: HTMLButtonElement, focus?: boolean) => {
      delete button.dataset.revealed;
      await invokePromise(LayoutOperation.ScrollIntoView, { subject: REVEAL_PLANK_ID, focus });
      // The state update renders in the first frame; the deck's effects have run by the second.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      button.dataset.revealed = 'true';
    },
    [invokePromise],
  );

  return (
    <div className='fixed bottom-2 start-2 z-10 flex gap-2'>
      <button data-testid='story.reveal' onClick={(event) => void reveal(event.currentTarget)}>
        Reveal
      </button>
      <button data-testid='story.reveal-without-focus' onClick={(event) => void reveal(event.currentTarget, false)}>
        Reveal without focus
      </button>
    </div>
  );
};

const NEW_PLANK_ID = `${STORY_WORKSPACE_ID}/story-item-3`;

/**
 * Opens the third story item as a new plank alongside whatever is already seeded (`disposition: 'add'`,
 * so the seeded planks stay mounted rather than being replaced) — the path the flash-of-unattended
 * regression test below drives.
 */
const TestOpenNextControls = ({ targetId }: { targetId?: string }) => {
  const { invokePromise } = useOperationInvoker();
  const handleClick = useCallback(() => {
    if (targetId) {
      void invokePromise(LayoutOperation.Open, { subject: [targetId], disposition: 'add' });
    }
  }, [invokePromise, targetId]);

  return (
    <div className='fixed bottom-2 end-2 z-10'>
      <button data-testid='story.open-next' onClick={handleClick} disabled={!targetId}>
        Open next
      </button>
    </div>
  );
};

// In-memory deck settings so stories don't read/write the persisted plugin settings.
const storyDeckSettings = Capability.makeModule(
  Effect.fnUntraced(function* () {
    const settingsAtom = Atom.make<Settings.Settings>({
      showHints: false,
      enableNativeRedirect: false,
    }).pipe(Atom.keepAlive);

    return [Capability.contribute(DeckCapabilities.Settings, settingsAtom)];
  }),
);

// In-memory deck state so each story starts from a clean deck; the real `DeckState()` capability
// persists to localStorage, which otherwise leaks planks between stories.
const storyDeckState = Capability.makeModule(
  Effect.fnUntraced(function* () {
    const stateAtom = Atom.make<DeckSchema.StoredDeckState>({
      sidebarState: 'closed',
      complementarySidebarState: 'closed',
      complementarySidebarPanel: undefined,
      activeDeck: 'default',
      previousDeck: 'default',
      decks: { default: { ...DeckSchema.defaultDeck } },
    }).pipe(Atom.keepAlive);

    const ephemeralAtom = Atom.make<DeckSchema.EphemeralDeckState>({
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
      open: {},
    }).pipe(Atom.keepAlive);

    const layoutAtom = Atom.make((get) => {
      const state = get(stateAtom);
      const ephemeral = get(ephemeralAtom);
      const deck = state.decks[state.activeDeck];
      invariant(deck, `Deck not found: ${state.activeDeck}`);
      const open = ephemeral.open[state.activeDeck] ?? DeckSchema.defaultOpenDeck;
      return {
        mode: DeckSchema.getMode(open, !!ephemeral.fullscreen),
        dialogOpen: ephemeral.dialogOpen,
        sidebarOpen: state.sidebarState === 'expanded',
        complementarySidebarOpen: state.complementarySidebarState === 'expanded',
        workspace: state.activeDeck,
        active: open.active,
        inactive: open.inactive,
        scrollIntoView: ephemeral.scrollIntoView?.id,
      } satisfies AppCapabilities.Layout;
    }).pipe(Atom.keepAlive);

    return [
      Capability.contribute(DeckCapabilities.State, stateAtom),
      Capability.contribute(DeckCapabilities.EphemeralState, ephemeralAtom),
      Capability.contribute(DeckCapabilities.Projection, yield* FiberHandle.make<string | undefined, any>()),
      Capability.contribute(AppCapabilities.Layout, layoutAtom),
    ];
  }),
);

const TestPlugin = Plugin.define(pluginMeta).pipe(
  // Shell state the Deck reads through the strict hooks on its first render, so it belongs on the
  // startup pass rather than the idle default these would otherwise normalize to.
  Plugin.addModule({
    id: 'story-deck-settings',
    activatesOn: ActivationEvents.Startup,
    provides: [DeckCapabilities.Settings],
    activate: storyDeckSettings,
  }),
  Plugin.addModule({
    id: 'story-deck-state',
    activatesOn: ActivationEvents.Startup,
    provides: [
      DeckCapabilities.State,
      DeckCapabilities.EphemeralState,
      DeckCapabilities.Projection,
      AppCapabilities.Layout,
    ],
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
          AppGraphBuilder.createExtension({
            id: 'storyWorkspace',
            // A node id may not itself contain '/' (`GraphNode.qualifyId`'s invariant), so the workspace
            // segment `PathResolution.representNode` requires has to come from a real intermediate node
            // rather than being folded into each item's raw id.
            match: GraphNodeMatcher.whenRoot,
            connector: () =>
              Effect.succeed([
                AppGraphNode.make({
                  id: DeckSchema.DEFAULT_DECK_ID,
                  type: 'story-workspace',
                  data: { id: DeckSchema.DEFAULT_DECK_ID },
                  properties: { label: 'Story workspace' },
                }),
              ]),
          }),
          AppGraphBuilder.createExtension({
            id: 'storyItems',
            // A URL binding, so `LayoutOperation.Open` can round-trip a story item through the deck's
            // real navigate-then-project path (as opposed to the other stories, which seed `active`
            // directly) — the exact path the flash-of-unattended regression test below exercises.
            url: { key: 'item', kind: 'item', path: [] },
            match: GraphNodeMatcher.whenNodeType('story-workspace'),
            connector: () =>
              Effect.succeed([
                ...STORY_ITEMS.map((item) =>
                  AppGraphNode.make({
                    id: item.id,
                    type: 'story-item',
                    data: item,
                    properties: { label: item.title, icon: item.icon },
                  }),
                ),
                // The launcher declares its chain on the node, the way the app resolves it off the type.
                AppGraphNode.make({
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
          AppGraphBuilder.createExtension({
            id: 'storyLauncherMessages',
            match: GraphNodeMatcher.whenNodeType('story-launcher'),
            connector: () =>
              Effect.succeed(
                LAUNCHER_MESSAGES.map((message) =>
                  AppGraphNode.make({
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
          AppGraphBuilder.createExtension({
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

type StoryArgs = {
  /** Renders controls that reveal a plank from outside the deck. */
  revealControls?: boolean;
  /** Renders a control that opens the third story item as a new plank via `LayoutOperation.Open`. */
  openNextControl?: boolean;
  /** Number of story planks to open on mount (0 renders the empty deck). */
  count?: number;
  /** Navigation sidebar state to seed. `closed` is only reachable below `lg`. */
  sidebarState?: DeckSchema.StoredDeckState['sidebarState'];
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
const NO_SETTINGS: StoryArgs['settings'] = {};

// Stable identity, so the default does not re-fire the seeding effect it is a dependency of on every render.
const NO_COMPANIONS: number[] = [];

const DefaultStory = ({
  count = 0,
  sidebarState = 'closed',
  companionPlanks = NO_COMPANIONS,
  launcher = false,
  revealControls = false,
  openNextControl = false,
  settings: settingsOverrides = NO_SETTINGS,
}: StoryArgs) => {
  const [settings, updateSettings] = useAtomCapabilityState(DeckCapabilities.Settings);

  // The deck reads its experiments from settings, not from props, so the story writes them there.
  useEffect(() => {
    updateSettings((current) => ({ ...current, ...settingsOverrides }));
  }, [settingsOverrides, updateSettings]);
  const pluginManager = usePluginManager();
  const { graph } = useAppGraph();
  const { state, deck, updateState, updateEphemeral } = useDeckState();

  // Root expands once, automatically, at graph-capability startup; the workspace node this story added
  // is not root, so nothing expands it on its own — this story owns expanding that one extra level, the
  // way `useLoadDescendents` does for a navtree branch. Without it each plank's `useNode` never resolves
  // and the deck stays in the loading state. The graph qualifies connector node ids with their parent
  // path (e.g. `root/default/story-item-1`), so the seeded `active` list holds the materialized ids
  // rather than the bare `STORY_ITEMS` ids.
  useState(() => AppGraph.expandSync(graph, STORY_WORKSPACE_ID, 'child'));
  const workspaceChildren = useConnections(graph, STORY_WORKSPACE_ID, 'child');
  const items = useMemo(() => workspaceChildren.filter((node) => node.type === 'story-item'), [workspaceChildren]);
  const launcherNode = useMemo(
    () => workspaceChildren.find((node) => node.type === 'story-launcher'),
    [workspaceChildren],
  );

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
        [current.activeDeck]: { ...current.decks[current.activeDeck], companionPlanks: open },
      },
    }));
    // What is open is the URL's, and there is no URL here, so the story writes it where the projection
    // would have.
    updateEphemeral((current) => ({
      ...current,
      open: { ...current.open, [state.activeDeck]: { active, inactive: [] } },
    }));
  }, [items, count, sidebarState, companionPlanks, launcher, launcherNode, updateState, updateEphemeral]);

  return (
    <>
      {revealControls && <TestRevealControls />}
      {openNextControl && <TestOpenNextControls targetId={items[2]?.id} />}
      <Deck.Root settings={settings} pluginManager={pluginManager} state={state} deck={deck} updateState={updateState}>
        <Deck.Content>
          <Deck.Viewport>{deck.active.length === 0 ? <Deck.ContentEmpty /> : <Deck.Planks />}</Deck.Viewport>
        </Deck.Content>
      </Deck.Root>
    </>
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
  const id = `${STORY_WORKSPACE_ID}/story-item-${position}`;
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

// A reveal that leaves focus where it is brings the plank forward without focusing it; a plain reveal
// focuses it.
export const RevealWithoutFocus: Story = {
  tags: ['test'],
  args: { count: 6, revealControls: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findAllByTestId('story.article', {}, { timeout: 30_000 });
    const plank = () =>
      canvasElement.querySelector<HTMLElement>(`[data-testid="deck.plank"][data-attendable-id="${REVEAL_PLANK_ID}"]`);
    await waitFor(() => expect(plank()).not.toBeNull());

    const withoutFocus = await canvas.findByTestId('story.reveal-without-focus');
    withoutFocus.focus();
    withoutFocus.click();
    await waitFor(() => expect(withoutFocus).toHaveAttribute('data-revealed', 'true'));
    await expect(document.activeElement).toBe(withoutFocus);

    const reveal = await canvas.findByTestId('story.reveal');
    reveal.focus();
    reveal.click();
    await waitFor(() => expect(reveal).toHaveAttribute('data-revealed', 'true'));
    await waitFor(() => expect(plank()?.contains(document.activeElement)).toBe(true));
  },
};

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

    // Every plank sits in a splitter panel, companion or not: a companion resolves a commit after its
    // plank mounts, so a shape that varied with it would unmount the plank and everything it holds.
    const planks = canvasElement.querySelectorAll<HTMLElement>('[data-testid="deck.plank"]');
    await expect(planks).toHaveLength(3);
    for (const plank of planks) {
      await expect(plank.closest('[data-scope="splitter"][data-part="panel"]')).not.toBeNull();
    }
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

const DISPLACED_PLANK_ID = `${STORY_WORKSPACE_ID}/story-item-1`;

/**
 * A newly opened plank's heading must never paint unattended: `LayoutOperation.Open` has to land its
 * focus in the same commit that inserts the plank, not a later one.
 *
 * A `MutationObserver` callback fires as a microtask at the end of the task that mutated the DOM — the
 * same boundary the browser paints against — so one callback invocation ("batch") is exactly what the
 * viewer would have seen painted after that task. Under the old code (a passive focus effect, plus a
 * `ScrollIntoView` operation scheduled as a detached followup) the plank's insertion and its focus landed
 * in two separate tasks: the insertion batch read the heading present but unattended, and a later batch
 * flipped it — the flash this fix removes. This asserts no batch is ever caught in that state.
 */
export const OpenFocusesBeforePaint: Story = {
  tags: ['test'],
  args: { count: 2, openNextControl: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findAllByTestId('story.article', {}, { timeout: 30_000 });

    // Something has to hold attention before the navigation for "the displaced plank ends up
    // unattended" to be a meaningful assertion.
    await attendPlank(canvasElement, 1);
    const displacedTitle = () =>
      canvasElement.querySelector<HTMLElement>(
        `[data-testid="deck.plank"][data-attendable-id="${DISPLACED_PLANK_ID}"] h1[data-attention]`,
      );
    await waitFor(() => expect(displacedTitle()).toHaveAttribute('data-attention', 'true'));

    const findNewPlank = () =>
      canvasElement.querySelector<HTMLElement>(`[data-testid="deck.plank"][data-attendable-id="${NEW_PLANK_ID}"]`);

    type Snapshot = { present: boolean; attended: boolean; focused: boolean };
    const snapshot = (): Snapshot => {
      const plank = findNewPlank();
      const title = plank?.querySelector<HTMLElement>('h1[data-attention]');
      return {
        present: !!plank,
        attended: title?.getAttribute('data-attention') === 'true',
        focused: !!plank && plank.contains(document.activeElement),
      };
    };

    const batches: Snapshot[] = [];
    const observer = new MutationObserver(() => batches.push(snapshot()));
    observer.observe(canvasElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-attention', 'data-w-attention-source'],
    });

    // The seeded planks bypassed the URL (see the seeding effect's comment), so the address bar is
    // still wherever Storybook left it. `LayoutOperation.Open` reads the *current* URL to learn which
    // workspace to navigate within, falling back to the deck's `activeDeck` token only when that URL
    // fails to parse — and `activeDeck` here is the bare token `'default'` with no `root/` prefix, which
    // fails that fallback (`GraphPath.getWorkspaceToken` expects a qualified path) and drops the
    // navigation silently. Priming a parseable URL first lets `Open` round-trip for real, through
    // `Navigation.push` and back through `projectUrl`, rather than only exercising the seeding path.
    const previousUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.history.replaceState(null, '', `/${UrlPath.WORKSPACE_KEY}/${DeckSchema.DEFAULT_DECK_ID}`);
    try {
      const openNext = await canvas.findByTestId('story.open-next');
      openNext.click();

      await waitFor(async () => {
        const plank = findNewPlank();
        await expect(plank).not.toBeNull();
        await expect(plank?.querySelector('h1[data-attention]')).toHaveAttribute('data-attention', 'true');
        await expect(plank?.contains(document.activeElement)).toBe(true);
      });

      observer.disconnect();

      await expect(batches.some((batch) => batch.present && !batch.attended)).toBe(false);

      // The plank that lost attention to the new one stays mounted (`disposition: 'add'`) but unattended.
      await expect(displacedTitle()).toHaveAttribute('data-attention', 'false');
    } finally {
      // Undoes the priming above so a later story in the same browser session does not inherit this
      // story's URL.
      window.history.replaceState(null, '', previousUrl);
    }
  },
};
