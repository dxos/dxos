//
// Copyright 2025 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { LocalStorageStore } from '@dxos/local-storage';
import { type SidebarState } from '@dxos/react-ui';

import { meta } from '../../meta';
import { DeckCapabilities, type DeckPluginState, type DeckState, defaultDeck, getMode } from '../../types';

/** Default initial state for testing. */
export const defaultDeckPluginState: DeckPluginState = {
  sidebarState: 'expanded',
  complementarySidebarState: 'collapsed',
  complementarySidebarPanel: undefined,
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
  activeDeck: 'default',
  previousDeck: 'default',
  decks: {
    default: { ...defaultDeck },
  },
  // NOTE: `deck` is derived from `decks[activeDeck]` at read time by useDeckState hook.
  // Do not use a getter here - it doesn't survive spread operations in state updates.
  deck: { ...defaultDeck },
  previousMode: {},
  scrollIntoView: undefined,
};

/** Creates an in-memory StateStore for testing/stories. */
export const createDeckStateStore = (
  initialState: Partial<DeckPluginState> = {},
): Common.Capability.StateStore<DeckPluginState> => {
  const registry = Registry.make();
  const atom = Atom.make<DeckPluginState>({
    ...defaultDeckPluginState,
    ...initialState,
  });

  return {
    atom,
    get state() {
      const values = registry.get(atom);
      const deck = values.decks[values.activeDeck];
      invariant(deck, `Deck not found: ${values.activeDeck}`);
      return { ...values, deck };
    },
    update: (fn) => {
      const current = registry.get(atom);
      registry.set(atom, fn(current));
    },
    subscribe: (callback) => registry.subscribe(atom, callback),
  };
};

/** Factory for stories - returns capability contribution. */
export const DeckStateFactory = (initialState: Partial<DeckPluginState> = {}) => {
  const stateStore = createDeckStateStore(initialState);
  return Capability.contributes(DeckCapabilities.State, stateStore);
};

const boolean = /true|false/;

// TODO(thure, 18 Feb 2025): Remove after the next release.

const migrateSidebarStateDefaults = {
  [`${meta.id}/complementary-sidebar-state`]: 'expanded',
  [`${meta.id}/sidebar-state`]: 'collapsed',
};

const migrateSidebarState = () => {
  Object.entries(migrateSidebarStateDefaults).forEach(([key, defaultValue]) => {
    if (boolean.test(localStorage.getItem(key) ?? 'never')) {
      localStorage.setItem(key, defaultValue);
    }
  });
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    migrateSidebarState();

    const store = new LocalStorageStore<DeckPluginState>(meta.id, {
      sidebarState: 'expanded',
      complementarySidebarState: 'collapsed',
      complementarySidebarPanel: undefined,
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
      activeDeck: 'default',
      previousDeck: 'default',
      decks: {
        default: { ...defaultDeck },
      },
      // NOTE: `deck` is derived from `decks[activeDeck]` at read time by useDeckState hook.
      // Do not use a getter here - it doesn't survive spread operations in state updates.
      deck: { ...defaultDeck },
      previousMode: {},
      scrollIntoView: undefined,
    });

    store
      .prop({ key: 'sidebarState', type: LocalStorageStore.enum<SidebarState>() })
      .prop({ key: 'complementarySidebarState', type: LocalStorageStore.enum<SidebarState>() })
      .prop({ key: 'complementarySidebarPanel', type: LocalStorageStore.string({ allowUndefined: true }) })
      .prop({ key: 'decks', type: LocalStorageStore.json<Record<string, DeckState>>() })
      .prop({ key: 'activeDeck', type: LocalStorageStore.string() })
      .prop({ key: 'previousDeck', type: LocalStorageStore.string() });

    // Don't allow fullscreen mode to be persisted to prevent getting stuck in it.
    if (store.values.deck.fullscreen) {
      store.update((current) => ({
        ...current,
        decks: {
          ...current.decks,
          [current.activeDeck]: {
            ...current.decks[current.activeDeck],
            fullscreen: false,
          },
        },
      }));
    }

    // Create StateStore interface.
    // NOTE: The `state` getter computes `deck` from `decks[activeDeck]` on every access
    // because the getter pattern doesn't survive spread operations in state updates.
    const stateStore: Common.Capability.StateStore<DeckPluginState> = {
      atom: store.atom,
      get state() {
        const values = store.values;
        const deck = values.decks[values.activeDeck];
        invariant(deck, `Deck not found: ${values.activeDeck}`);
        return { ...values, deck };
      },
      update: store.update.bind(store),
      subscribe: (callback) => store.registry.subscribe(store.atom, callback),
    };

    // Create layout capability that derives from state.
    const layoutAtom = Atom.make((get) => {
      const state = get(store.atom);
      const deck = state.decks[state.activeDeck];
      invariant(deck, `Deck not found: ${state.activeDeck}`);
      return {
        mode: getMode(deck),
        dialogOpen: state.dialogOpen,
        sidebarOpen: state.sidebarState === 'expanded',
        complementarySidebarOpen: state.complementarySidebarState === 'expanded',
        workspace: state.activeDeck,
        active: deck.solo ? [deck.solo] : deck.active,
        inactive: deck.inactive,
        scrollIntoView: state.scrollIntoView,
      } satisfies Common.Capability.Layout;
    });

    const layoutStore: Common.Capability.StateStore<Common.Capability.Layout> = {
      atom: layoutAtom as unknown as Atom.Writable<Common.Capability.Layout>,
      get state() {
        return store.registry.get(layoutAtom);
      },
      update: () => {
        throw new Error('Layout is read-only, update DeckState instead');
      },
      subscribe: (callback) => store.registry.subscribe(layoutAtom, callback),
    };

    return [
      Capability.contributes(DeckCapabilities.State, stateStore, () => Effect.sync(() => store.close())),
      Capability.contributes(Common.Capability.Layout, layoutStore.state),
    ];
  }),
);
