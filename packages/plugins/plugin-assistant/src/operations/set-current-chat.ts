//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';

import { AssistantCapabilities, AssistantOperation } from '#types';

const handler: Operation.WithHandler<typeof AssistantOperation.SetCurrentChat> = AssistantOperation.SetCurrentChat.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ companionTo, chat }) {
      const companionToId = Obj.getURI(companionTo);

      if (chat) {
        const chatId = Obj.getURI(chat);
        yield* Capabilities.updateAtomValue(AssistantCapabilities.State, (current) => ({
          ...current,
          currentChat: { ...current.currentChat, [companionToId]: chatId },
        }));
      } else {
        // New thread: create a transient chat and cache it so the graph connector
        // can resolve it immediately via the cache fallback tier.
        const operationInvoker = yield* Capability.get(Capabilities.OperationInvoker);
        const db = Obj.getDatabase(companionTo);
        if (db) {
          const { data } = yield* Effect.promise(() =>
            operationInvoker.invokePromise(AssistantOperation.CreateChat, { db, addToSpace: false }),
          );
          if (data?.object) {
            yield* Capabilities.updateAtomValue(AssistantCapabilities.CompanionChatCache, (current) => ({
              ...current,
              [companionToId]: data.object,
            }));
          }
        }
        yield* Capabilities.updateAtomValue(AssistantCapabilities.State, (current) => ({
          ...current,
          currentChat: { ...current.currentChat, [companionToId]: undefined },
        }));
      }
    }),
  ),
);

export default handler;
