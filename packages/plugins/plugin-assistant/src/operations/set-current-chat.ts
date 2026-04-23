//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { AssistantCapabilities } from '../types';
import { CreateChat, SetCurrentChat } from './definitions';

const handler: Operation.WithHandler<typeof SetCurrentChat> = SetCurrentChat.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ companionTo, chat }) {
      const companionToId = Obj.getDXN(companionTo).toString();

      if (chat) {
        const chatId = Obj.getDXN(chat).toString();
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
            operationInvoker.invokePromise(CreateChat, { db, addToSpace: false }),
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
