//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Chat } from '@dxos/assistant-toolkit';
import { Filter, Obj, Query } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { AssistantCapabilities } from '../types';
import { CreateChat, EnsureCompanionChat, SetCurrentChat } from './definitions';

const handler: Operation.WithHandler<typeof EnsureCompanionChat> = EnsureCompanionChat.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, companionTo }) {
      const operationInvoker = yield* Capability.get(Capabilities.OperationInvoker);
      const companionDxn = Obj.getDXN(companionTo).toString();

      // 1. Look for an existing persisted companion chat in the space.
      const existingChats = yield* Effect.promise(() =>
        db.query(Query.select(Filter.id(companionTo.id)).targetOf(Chat.CompanionTo).source()).run(),
      );
      if (existingChats.length > 0) {
        const chat = existingChats.at(-1) as Chat.Chat;
        // Cache the persisted chat so the graph connector can resolve it immediately
        // via the cache fallback, without waiting for AtomObj.make(ref) to hydrate.
        yield* Capabilities.updateAtomValue(AssistantCapabilities.CompanionChatCache, (current) => ({
          ...current,
          [companionDxn]: chat,
        }));
        yield* Effect.promise(() => operationInvoker.invokePromise(SetCurrentChat, { companionTo, chat }));
        return { chat, persisted: true };
      }

      // 2. Return cached transient chat for this companion if present.
      const cache = yield* Capabilities.getAtomValue(AssistantCapabilities.CompanionChatCache);
      const cached = cache[companionDxn] as Chat.Chat | undefined;
      if (cached) {
        return { chat: cached, persisted: false };
      }

      // 3. Create a new transient chat, cache it, and return it without persisting.
      const { data } = yield* Effect.promise(() =>
        operationInvoker.invokePromise(CreateChat, { db, addToSpace: false }),
      );
      if (!data?.object) {
        return yield* Effect.fail(new Error('CreateChat did not return a chat object'));
      }
      const chat = data.object;
      yield* Capabilities.updateAtomValue(AssistantCapabilities.CompanionChatCache, (current) => ({
        ...current,
        [companionDxn]: chat,
      }));
      return { chat, persisted: false };
    }),
  ),
);

export default handler;
