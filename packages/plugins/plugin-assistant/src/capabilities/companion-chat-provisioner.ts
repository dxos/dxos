//
// Copyright 2025 DXOS.org
//

import { type Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Graph, type GraphBuilder, type Node } from '@dxos/app-graph';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Chat } from '@dxos/assistant-toolkit';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import type { OperationInvoker } from '@dxos/operation';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import {
  COMPANION_VIEW_STATE_CONTEXT,
  DeckCapabilities,
  PLANK_COMPANION_TYPE,
  type StoredDeckState,
  companionVariantAspect,
} from '@dxos/plugin-deck';
import { getLinkedVariant } from '@dxos/react-ui-attention';
import { Position } from '@dxos/util';

import { ASSISTANT_COMPANION_VARIANT } from '#meta';
import { AssistantCapabilities, AssistantOperation } from '#types';

/**
 * Non-React capability that watches deck companion state and provisions transient chats
 * for active planks when the assistant companion is selected.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const operationInvoker = yield* Capabilities.OperationInvoker;
    const { graph } = yield* AppCapabilities.AppGraph;
    const registry: Registry.Registry = yield* Capabilities.AtomRegistry;
    const deckStateAtom = yield* DeckCapabilities.State;
    const cacheAtom = yield* AssistantCapabilities.CompanionChatCache;
    const stateAtom = yield* AssistantCapabilities.State;
    // The selected companion variant moved off deck state into a global view-state aspect; read and
    // observe it directly so a tab switch (which no longer touches deck state) still re-provisions.
    const viewState = yield* AttentionCapabilities.ViewState;
    const variantAtom = viewState.atom(companionVariantAspect, COMPANION_VIEW_STATE_CONTEXT);

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
        .invokePromise(AssistantOperation.EnsureCompanionChat, { db, companionTo: object })
        .catch((error) => log.warn('Failed to provision companion chat', { plankId, error }));

      return false;
    };

    const provision = () => {
      const deckState: StoredDeckState = registry.get(deckStateAtom);
      const deck = deckState.decks[deckState.activeDeck];
      if (!deck?.companionOpen) {
        unsubAllPlanks();
        return;
      }

      const companionVariant = registry.get(variantAtom).variant;
      const plankIds = new Set(deck.solo ? [deck.solo] : deck.active);

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
          // Not yet resolved — subscribe to child connections so we re-try
          // when graph builder extensions add companion nodes (after expand). This subscription
          // outlives the current `provision()` run, so re-read the latest variant at callback time
          // rather than closing over the one captured here.
          plankSubs.set(
            plankId,
            registry.subscribe(graph.connections(plankId, 'child'), () => {
              if (provisionForPlank(plankId, registry.get(variantAtom).variant)) {
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
    const unsub3 = registry.subscribe(variantAtom, provision);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsub1();
        unsub2();
        unsub3();
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
  graph: Graph.BaseGraph,
  plankId: string,
  preferredVariant: string | undefined,
): string | undefined => {
  const companions = Graph.getConnections(graph, plankId, 'child')
    .filter((node) => node.type === PLANK_COMPANION_TYPE)
    .toSorted((a, b) => Position.compare(a.properties, b.properties));

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
