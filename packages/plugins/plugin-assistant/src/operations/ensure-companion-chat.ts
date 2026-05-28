//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Chat } from '@dxos/assistant-toolkit';
import { Operation } from '@dxos/compute';
import { Filter, Obj, Query } from '@dxos/echo';

import { AssistantCapabilities, AssistantOperation } from '#types';

const handler: Operation.WithHandler<typeof AssistantOperation.EnsureCompanionChat> =
  AssistantOperation.EnsureCompanionChat.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ db, companionTo }) {
        const operationInvoker = yield* Capability.get(Capabilities.OperationInvoker);
        const companionUri = Obj.getURI(companionTo);

        // 1. Look for an existing persisted companion chat in the space.
        const existingChats = yield* Effect.promise(() =>
          db.query(Query.select(Filter.id(companionTo.id)).targetOf(Chat.CompanionTo).source()).run(),
        );
        const existingChat = existingChats.at(-1);
        if (existingChat) {
          // Cache the persisted chat so the graph connector can resolve it immediately
          // via the cache fallback, without waiting for AtomObj.make(ref) to hydrate.
          yield* Capabilities.updateAtomValue(AssistantCapabilities.CompanionChatCache, (current) => ({
            ...current,
            [companionUri]: existingChat,
          }));
          yield* Effect.promise(() =>
            operationInvoker.invokePromise(AssistantOperation.SetCurrentChat, { companionTo, chat: existingChat }),
          );
          return { chat: existingChat, persisted: true };
        }

        // 2. Return cached transient chat for this companion if present.
        const cache = yield* Capabilities.getAtomValue(AssistantCapabilities.CompanionChatCache);
        const cached = cache[companionUri] as Chat.Chat | undefined;
        if (cached) {
          return { chat: cached, persisted: false };
        }

        // 3. Create a new transient chat, cache it, and return it without persisting.
        const { data } = yield* Effect.promise(() =>
          operationInvoker.invokePromise(AssistantOperation.CreateChat, { db, addToSpace: false }),
        );
        if (!data?.object) {
          return yield* Effect.fail(new Error('CreateChat did not return a chat object'));
        }
        const chat = data.object;
        yield* Capabilities.updateAtomValue(AssistantCapabilities.CompanionChatCache, (current) => ({
          ...current,
          [companionUri]: chat,
        }));
        return { chat, persisted: false };
      }),
    ),
  );

export default handler;
