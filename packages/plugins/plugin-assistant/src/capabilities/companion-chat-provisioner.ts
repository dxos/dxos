//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as Chat from '@dxos/assistant/Chat';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as CompanionViewState from '@dxos/plugin-deck/CompanionViewState';
import * as DeckCapabilities from '@dxos/plugin-deck/DeckCapabilities';
import * as DeckSchema from '@dxos/plugin-deck/DeckSchema';
import { Attention } from '@dxos/react-ui-attention/types';
import { Position } from '@dxos/util';

import { ASSISTANT_COMPANION_VARIANT } from '#meta';
import { AssistantCapabilities, AssistantOperation } from '#types';
import { AssistantEvents } from '#types';

/**
 * Non-React capability that watches deck companion state and provisions transient chats
 * for active planks when the assistant companion is selected.
 */
export const CompanionChatProvisioner = Capability.makeModule(
  'CompanionChatProvisioner',
  {
    environments: [],
    requires: [
      Capabilities.OperationInvoker,
      AppCapabilities.AppGraph,
      Capabilities.AtomRegistry,
      // DeckCapabilities.State is read optionally in the body: provisioning is driven by deck
      // planks, so a host without a deck (e.g. a story) has nothing to provision for and should
      // lose this module, not fail to activate AssistantPlugin.
      AssistantCapabilities.CompanionChatCache,
      AssistantCapabilities.State,
      AttentionCapabilities.ViewState,
    ],
    provides: [],
    activatesOn: AssistantEvents.Start,
  },
  Effect.fnUntraced(function* () {
    const operationInvoker = yield* Capabilities.OperationInvoker;
    const { graph } = yield* AppCapabilities.AppGraph;
    const registry: Registry.AtomRegistry = yield* Capabilities.AtomRegistry;

    // Optional: provisioning is keyed off deck planks, so a host without a deck has nothing to
    // provision for.
    const deckStateOption = yield* Capability.getOption(DeckCapabilities.State);
    if (Option.isNone(deckStateOption)) {
      return [];
    }
    const deckStateAtom = deckStateOption.value;
    // What is open is derived from the URL and lives in the deck's ephemeral state, not its stored one.
    const deckEphemeralOption = yield* Capability.getOption(DeckCapabilities.EphemeralState);
    if (Option.isNone(deckEphemeralOption)) {
      return [];
    }
    const deckEphemeralAtom = deckEphemeralOption.value;
    // An untouched companion flag means different things flat and stacked, so it cannot be read without
    // the layout setting.
    const deckSettingsAtom = Option.getOrUndefined(yield* Capability.getOption(DeckCapabilities.Settings));
    // The mobile drawer and the desktop companion plank record "which companion is on screen" in
    // different fields, so the host has to be known before that state can be read.
    const platform = yield* Capability.get(DeckCapabilities.Platform).pipe(
      Effect.catch(() => Effect.succeed('desktop' as const)),
    );

    const cacheAtom = yield* AssistantCapabilities.CompanionChatCache;
    const stateAtom = yield* AssistantCapabilities.State;
    // The selected companion variant moved off deck state into a global view-state aspect; read and
    // observe it directly so a tab switch (which no longer touches deck state) still re-provisions.
    // Project just the variant so a companion resize (same aspect) does not re-fire provisioning.
    const viewState = yield* AttentionCapabilities.ViewState;
    const variantAtom = Atom.make(
      (get) => get(viewState.atom(CompanionViewState.aspect, CompanionViewState.CONTEXT)).variant,
    );

    const plankSubs = new Map<string, () => void>();

    /** Unsubscribe a single plank and remove it from the map. */
    const unsubPlank = (plankId: string) => {
      plankSubs.get(plankId)?.();
      plankSubs.delete(plankId);
    };

    /** Unsubscribe all per-plank subscriptions. */
    const unsubAllPlanks = () => {
      for (const unsub of plankSubs.values()) {
        unsub();
      }
      plankSubs.clear();
    };

    /**
     * Attempt to provision for a single plank.
     * Returns true when the plank is resolved (provisioned or already cached)
     * so the caller can tear down the connection subscription.
     */
    const provisionForPlank = (plankId: string, companionVariant: string | undefined): boolean => {
      const node: AppGraphNode.Node | null = AppGraph.getNode(graph, plankId).pipe(Option.getOrNull);
      if (!node || !Obj.isObject(node.data) || Obj.instanceOf(Chat.Chat, node.data)) {
        return false;
      }

      if (resolveEffectiveVariant(graph, plankId, companionVariant) !== ASSISTANT_COMPANION_VARIANT) {
        return false;
      }

      const object = node.data;
      const companionUri = Obj.getURI(object);
      const cache = registry.get(cacheAtom);
      if (cache[companionUri]) {
        return true;
      }

      const db = Obj.getDatabase(object);
      if (!db) {
        log.warn('No db for object', { plankId, companionUri });
        return false;
      }

      void operationInvoker
        .invokePromise(AssistantOperation.EnsureCompanionChat, { companionTo: object }, { spaceId: db.spaceId })
        .catch((error) => log.warn('Failed to provision companion chat', { plankId, error }));

      return false;
    };

    const provision = () => {
      const deckState: DeckSchema.StoredDeckState = registry.get(deckStateAtom);
      const deck = deckState.decks[deckState.activeDeck];
      const active: string[] = registry.get(deckEphemeralAtom).open[deckState.activeDeck]?.active ?? [];
      const { open, variant: companionVariant } = DeckSchema.getCompanionSelection(
        platform,
        deckState,
        registry.get(variantAtom),
        deckSettingsAtom && registry.get(deckSettingsAtom).flatten,
      );
      if (!deck || !open) {
        unsubAllPlanks();
        return;
      }

      const plankIds = new Set(active);

      // Remove subscriptions for planks that are no longer active.
      for (const trackedId of plankSubs.keys()) {
        if (!plankIds.has(trackedId)) {
          unsubPlank(trackedId);
        }
      }

      for (const plankId of plankIds) {
        const resolved = provisionForPlank(plankId, companionVariant);

        if (resolved) {
          // Already provisioned — no need to watch connections.
          unsubPlank(plankId);
        } else if (!plankSubs.has(plankId)) {
          AppGraph.expandSync(graph, plankId, AppNode.companion);
          plankSubs.set(
            plankId,
            registry.subscribe(graph.connections(plankId, AppNode.companion), () => {
              if (provisionForPlank(plankId, registry.get(variantAtom))) {
                unsubPlank(plankId);
              }
            }),
          );
        }
      }
    };

    provision();

    const unsub1 = registry.subscribe(deckStateAtom, provision);
    const unsubOpen = registry.subscribe(deckEphemeralAtom, provision);
    const unsub2 = registry.subscribe(stateAtom, provision);
    const unsub3 = registry.subscribe(variantAtom, provision);
    const unsubSettings = deckSettingsAtom ? registry.subscribe(deckSettingsAtom, provision) : () => {};

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsub1();
        unsubOpen();
        unsub2();
        unsub3();
        unsubSettings();
        unsubAllPlanks();
      }),
    );
    return [];
  }),
);

/**
 * Mirrors useSelectedCompanion fallback logic outside of React.
 * Returns the variant that would actually be rendered for a given plank.
 */
const resolveEffectiveVariant = (
  graph: AppGraph.BaseGraph,
  plankId: string,
  preferredVariant: string | undefined,
): string | undefined => {
  const companions = AppGraph.getConnections(graph, plankId, AppNode.companion)
    .filter(DeckSchema.isPlankCompanion)
    .toSorted((a, b) => Position.compare(a.properties, b.properties));

  const selected = DeckSchema.selectCompanion(companions, preferredVariant);
  return selected && Attention.getLinkedVariant(selected.id);
};
