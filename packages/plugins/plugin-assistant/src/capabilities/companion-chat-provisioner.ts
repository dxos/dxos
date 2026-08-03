//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Graph, type Node } from '@dxos/app-graph';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Chat } from '@dxos/assistant-toolkit';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import {
  DeckCapabilities,
  PLANK_COMPANION_TYPE,
  type StoredDeckState,
  getNodeCompanionVariant,
} from '@dxos/plugin-deck';
import { Attention } from '@dxos/react-ui-attention';
import { Position } from '@dxos/util';

import { ASSISTANT_COMPANION_VARIANT } from '#meta';
import { AssistantCapabilities, AssistantOperation } from '#types';

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
    // Companions live in the complementary sidebar, which stores the selected node companion as its
    // panel. Project just the variant so unrelated deck-state churn does not re-fire provisioning.
    const variantAtom = Atom.make((get) => getNodeCompanionVariant(get(deckStateAtom).complementarySidebarPanel));

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
      if (!deck) {
        unsubAllPlanks();
        return;
      }

      // Which planks need a companion chat: every active plank while the sidebar is showing the
      // assistant, plus the source of any popped assistant clone — a clone is pinned to its source and
      // stays live whatever the sidebar is doing.
      const targets = new Map<string, string | undefined>();
      if (deckState.complementarySidebarState === 'expanded') {
        const sidebarVariant = registry.get(variantAtom);
        for (const plankId of deck.active) {
          targets.set(plankId, sidebarVariant);
        }
      }
      for (const plankId of deck.active) {
        if (Attention.isLinkedSegment(plankId) && Attention.getLinkedVariant(plankId) === ASSISTANT_COMPANION_VARIANT) {
          const sourceId = Attention.getParentId(plankId);
          if (sourceId) {
            targets.set(sourceId, ASSISTANT_COMPANION_VARIANT);
          }
        }
      }

      const plankIds = new Set(targets.keys());
      if (plankIds.size === 0) {
        unsubAllPlanks();
        return;
      }

      // Remove subscriptions for planks that are no longer active.
      for (const trackedId of plankSubs.keys()) {
        if (!plankIds.has(trackedId)) {
          unsubPlank(trackedId);
        }
      }

      for (const plankId of plankIds) {
        const companionVariant = targets.get(plankId);
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
              if (provisionForPlank(plankId, targets.get(plankId) ?? registry.get(variantAtom))) {
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

    return Capability.contributes(Capabilities.Null, null, () =>
      Effect.sync(() => {
        unsub1();
        unsub2();
        unsub3();
        unsubAllPlanks();
      }),
    );
  }),
);

/**
 * Mirrors the sidebar's fallback outside of React: the variant that would actually be shown for a plank,
 * falling back to its first companion when the selected one is not among them.
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
    const preferred = companions.find((companion) => Attention.getLinkedVariant(companion.id) === preferredVariant);
    if (preferred) {
      return Attention.getLinkedVariant(preferred.id);
    }
  }

  return Attention.getLinkedVariant(companions[0].id);
};
