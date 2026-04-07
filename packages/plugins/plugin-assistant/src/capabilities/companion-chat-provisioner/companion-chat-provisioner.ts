//
// Copyright 2025 DXOS.org
//

import { type Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Graph, type Node } from '@dxos/app-graph';
import { Chat } from '@dxos/assistant-toolkit';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { DeckCapabilities, PLANK_COMPANION_TYPE, type StoredDeckState } from '@dxos/plugin-deck/types';
import { getLinkedVariant } from '@dxos/react-ui-attention';
import { byPosition } from '@dxos/util';

import { ASSISTANT_COMPANION_VARIANT } from '../../meta';
import { AssistantCapabilities } from '../../types';
import { AssistantOperation } from '../../operations';

/**
 * Non-React capability that watches deck companion state and provisions transient chats
 * for active planks when the assistant companion is selected.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const operationInvoker = yield* Capability.get(Capabilities.OperationInvoker);
    const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
    const registry: Registry.Registry = yield* Capability.get(Capabilities.AtomRegistry);
    const deckStateAtom = yield* Capability.get(DeckCapabilities.State);
    const cacheAtom = yield* Capability.get(AssistantCapabilities.CompanionChatCache);
    const stateAtom = yield* Capability.get(AssistantCapabilities.State);

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
      const node: Node.Node | null = Graph.getNode(graph, plankId).pipe(Option.getOrNull);
      if (!node || !Obj.isObject(node.data) || Obj.instanceOf(Chat.Chat, node.data)) {
        return false;
      }

      if (resolveEffectiveVariant(graph, plankId, companionVariant) !== ASSISTANT_COMPANION_VARIANT) {
        return false;
      }

      const object = node.data;
      const companionDxn = Obj.getDXN(object).toString();
      const cache = registry.get(cacheAtom);
      const state = registry.get(stateAtom);
      if (cache[companionDxn] || state.currentChat[companionDxn]) {
        return true;
      }

      const db = Obj.getDatabase(object);
      if (!db) {
        return false;
      }

      void operationInvoker
        .invokePromise(AssistantOperation.EnsureCompanionChat, { db, companionTo: object })
        .catch((error) => log.warn('Failed to provision companion chat', { plankId, error }));

      return true;
    };

    const provision = () => {
      const deckState: StoredDeckState = registry.get(deckStateAtom);
      const deck = deckState.decks[deckState.activeDeck];
      if (!deck?.companionOpen) {
        unsubAllPlanks();
        return;
      }

      const plankIds = new Set(deck.solo ? [deck.solo] : deck.active);

      // Remove subscriptions for planks that are no longer active.
      for (const trackedId of plankSubs.keys()) {
        if (!plankIds.has(trackedId)) {
          unsubPlank(trackedId);
        }
      }

      for (const plankId of plankIds) {
        const resolved = provisionForPlank(plankId, deck.companionVariant);

        if (resolved) {
          // Already provisioned — no need to watch connections.
          unsubPlank(plankId);
        } else if (!plankSubs.has(plankId)) {
          // Not yet resolved — subscribe to child connections so we re-try
          // when graph builder extensions add companion nodes (after expand).
          plankSubs.set(
            plankId,
            registry.subscribe(graph.connections(plankId, 'child'), () => {
              if (provisionForPlank(plankId, deck.companionVariant)) {
                unsubPlank(plankId);
              }
            }),
          );
        }
      }
    };

    provision();

    const unsub1 = registry.subscribe(deckStateAtom, provision);
    const unsub2 = registry.subscribe(stateAtom, provision);

    return Capability.contributes(Capabilities.Null, null, () =>
      Effect.sync(() => {
        unsub1();
        unsub2();
        unsubAllPlanks();
      }),
    );
  }),
);

/**
 * Mirrors useSelectedCompanion fallback logic outside of React.
 * Returns the variant that would actually be rendered for a given plank.
 */
const resolveEffectiveVariant = (
  graph: Graph.BaseGraph,
  plankId: string,
  preferredVariant: string | undefined,
): string | undefined => {
  const companions = Graph.getConnections(graph, plankId, 'child')
    .filter((node) => node.type === PLANK_COMPANION_TYPE)
    .toSorted((a, b) => byPosition(a.properties, b.properties));

  if (companions.length === 0) {
    return undefined;
  }

  if (preferredVariant) {
    const preferred = companions.find((companion) => getLinkedVariant(companion.id) === preferredVariant);
    if (preferred) {
      return getLinkedVariant(preferred.id);
    }
  }

  return getLinkedVariant(companions[0].id);
};
