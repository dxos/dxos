//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Feed, Filter } from '@dxos/echo';
import { type CompletionGuard } from '@dxos/functions-runtime';

import { Chat, Plan } from '../types';

const findChatForFeed = (feed: Feed.Feed): Effect.Effect<Chat.Chat | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const chats = yield* Database.query(Filter.type(Chat.Chat)).run;
    for (const chat of chats) {
      const matches = yield* Effect.gen(function* () {
        const chatFeed = yield* Database.load(chat.feed);
        return chatFeed.id === feed.id;
      }).pipe(Effect.orElseSucceed(() => false));
      if (matches) {
        return chat;
      }
    }
    return undefined;
  });

/**
 * Returns a markdown plan summary when the conversation still has open plan tasks.
 */
export const makePlanCompletionGuard = (): CompletionGuard => ({
  getIncompletePlanSummary: (feed) =>
    Effect.gen(function* () {
      const chat = yield* findChatForFeed(feed);
      if (!chat?.plan) {
        return undefined;
      }
      const plan = yield* Database.load(chat.plan).pipe(Effect.orElseSucceed(() => undefined));
      if (!plan || !Plan.hasIncompleteTasks(plan)) {
        return undefined;
      }
      return Plan.formatPlan(plan);
    }),
});
