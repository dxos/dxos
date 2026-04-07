//
// Copyright 2025 DXOS.org
//

import { type Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Chat } from '@dxos/assistant-toolkit';
import { Graph, type Node } from '@dxos/app-graph';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { DeckCapabilities, type StoredDeckState } from '@dxos/plugin-deck/types';

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

    const provision = () => {
      const deckState: StoredDeckState = registry.get(deckStateAtom);
      const deck = deckState.decks[deckState.activeDeck];
      if (!deck?.companionOpen || deck.companionVariant !== ASSISTANT_COMPANION_VARIANT) {
        return;
      }

      const cache = registry.get(cacheAtom);
      const state = registry.get(stateAtom);
      const plankIds = deck.solo ? [deck.solo] : deck.active;

      for (const plankId of plankIds) {
        const node: Node.Node | null = Graph.getNode(graph, plankId).pipe(Option.getOrNull);
        if (!node || !Obj.isObject(node.data) || Obj.instanceOf(Chat.Chat, node.data)) {
          continue;
        }

        const object = node.data;
        const companionDxn = Obj.getDXN(object).toString();
        if (cache[companionDxn] || state.currentChat[companionDxn]) {
          continue;
        }

        const db = Obj.getDatabase(object);
        if (!db) {
          continue;
        }

        void operationInvoker
          .invokePromise(AssistantOperation.EnsureCompanionChat, { db, companionTo: object })
          .catch((error) => log.warn('Failed to provision companion chat', { plankId, error }));
      }
    };

    provision();

    const unsub1 = registry.subscribe(deckStateAtom, provision);
    const unsub2 = registry.subscribe(stateAtom, provision);

    return Capability.contributes(Capabilities.Null, null, () =>
      Effect.sync(() => {
        unsub1();
        unsub2();
      }),
    );
  }),
);
