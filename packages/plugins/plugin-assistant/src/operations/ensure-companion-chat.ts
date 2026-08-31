//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { Chat } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query } from '@dxos/echo';

import { AssistantCapabilities, AssistantOperation } from '#types';

const handler: Operation.WithHandler<typeof AssistantOperation.EnsureCompanionChat> =
  AssistantOperation.EnsureCompanionChat.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ companionTo }) {
        const { db } = yield* Database.Service;
        const companionUri = Obj.getURI(companionTo);

        // Idempotent, so it runs on every branch rather than only on creation: re-binding an existing
        // chat backfills whatever its subject's providers contribute now but did not when it was made.
        const bindContext = (chat: Chat.Chat) =>
          Operation.invoke(AssistantOperation.BindChatContext, { chat, subject: companionTo });

        // 1. Look for an existing persisted companion chat in the space: the subject's latest
        // chat child (entity ids are ULIDs, so id order is creation order).
        const children = yield* Effect.promise(() =>
          db.query(Query.select(Filter.id(companionTo.id)).children()).run(),
        );
        const existingChat = children
          .filter(Obj.instanceOf(Chat.Chat))
          .sort((left, right) => left.id.localeCompare(right.id))
          .at(-1);
        if (existingChat) {
          // Cache the persisted chat so the graph connector can resolve it immediately
          // via the cache fallback, without waiting for AtomObj.make(ref) to hydrate.
          yield* Capabilities.updateAtomValue(AssistantCapabilities.CompanionChatCache, (current) => ({
            ...current,
            [companionUri]: existingChat,
          }));
          yield* Operation.invoke(AssistantOperation.SetCurrentChat, { companionTo, chat: existingChat });
          yield* bindContext(existingChat);
          return { chat: existingChat, persisted: true };
        }

        // 2. Return cached transient chat for this companion if present.
        const cache = yield* Capabilities.getAtomValue(AssistantCapabilities.CompanionChatCache);
        const cached = cache[companionUri] as Chat.Chat | undefined;
        if (cached) {
          yield* bindContext(cached);
          return { chat: cached, persisted: false };
        }

        // 3. Create a new transient chat, cache it, and return it without persisting.
        const { object: chat } = yield* Operation.invoke(AssistantOperation.CreateChat, {});
        yield* Capabilities.updateAtomValue(AssistantCapabilities.CompanionChatCache, (current) => ({
          ...current,
          [companionUri]: chat,
        }));
        yield* bindContext(chat);
        return { chat, persisted: false };
      }),
    ),
  );

export default handler;
