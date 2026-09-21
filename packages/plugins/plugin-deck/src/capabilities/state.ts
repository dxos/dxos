//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FiberHandle from 'effect/FiberHandle';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { createKvsStore } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { meta } from '#meta';
import { DeckCapabilities, DeckSchema } from '#types';

const STATE_KEY = `${meta.profile.key}.state`;

/** Default persisted state. */
const defaultDeckState: DeckSchema.StoredDeckState = {
  sidebarState: 'expanded',
  complementarySidebarState: 'collapsed',
  complementarySidebarPanel: undefined,
  drawerState: undefined,
  drawerHeight: undefined,
  activeDeck: DeckSchema.DEFAULT_DECK_ID,
  previousDeck: DeckSchema.DEFAULT_DECK_ID,
  decks: {
    [DeckSchema.DEFAULT_DECK_ID]: { ...DeckSchema.defaultDeck },
  },
};

/** Default ephemeral state. */
const defaultDeckEphemeralState: DeckSchema.EphemeralDeckState = {
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
};

export const DeckState = Capability.makeModule(
  'DeckState',
  {
    // App-shell state, so it belongs on the startup pass rather than the idle default: the deck
    // root and `DeckLayout` read it on their FIRST render, and the shell cannot paint without it.
    // The gate belongs here, on the provider — declaring it as the reader's `requires` instead
    // demotes the reader into this module's wave rather than promoting this module.
    activatesOn: ActivationEvents.Startup,
    requires: [Capabilities.AtomRegistry],
    provides: [
      DeckCapabilities.State,
      DeckCapabilities.EphemeralState,
      AppCapabilities.Layout,
      DeckCapabilities.Platform,
      DeckCapabilities.Projection,
    ],
  },
  Effect.fnUntraced(function* ({ platform = 'desktop' }: DeckCapabilities.DeckPluginOptions = {}) {
    // Persisted state using KVS store.
    const stateAtom = createKvsStore({
      key: STATE_KEY,
      schema: DeckSchema.StoredDeckState,
      defaultValue: () => ({ ...defaultDeckState }),
    });

    // One projection at a time: `FiberHandle.run` interrupts whatever it is holding, and the handle
    // interrupts its fiber when this module's scope closes.
    const projection = yield* FiberHandle.make<string | undefined, any>();

    // Ephemeral state (not persisted, but kept alive to prevent GC resets).
    const ephemeralAtom = Atom.make<DeckSchema.EphemeralDeckState>({ ...defaultDeckEphemeralState }).pipe(
      Atom.keepAlive,
    );

    // Create derived layout atom (read-only) from both state atoms.
    const layoutAtom = Atom.make((get) => {
      const state = get(stateAtom);
      const ephemeral = get(ephemeralAtom);
      const deck = state.decks[state.activeDeck];
      invariant(deck, `Deck not found: ${state.activeDeck}`);
      const open = ephemeral.open[state.activeDeck] ?? DeckSchema.defaultOpenDeck;
      return {
        mode: platform === 'mobile' ? 'mobile' : DeckSchema.getMode(open, !!ephemeral.fullscreen),
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
      Capability.contribute(DeckCapabilities.Projection, projection),
      Capability.contribute(AppCapabilities.Layout, layoutAtom),
      Capability.contribute(DeckCapabilities.Platform, platform),
    ];
  }),
);
