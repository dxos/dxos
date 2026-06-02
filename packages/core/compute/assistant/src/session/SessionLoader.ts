//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Feed, Filter, Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

import { SessionLink } from './SessionLink';

/**
 * Loads and reifies conversation history by resolving SessionLink feed records.
 */
export class SessionLoader {
  /**
   * Prepends linked history to `messages` when the feed contains a SessionLink.
   * Queries the feed for any SessionLink record; if found, loads messages from
   * the referenced feed up to and including `messageId` and prepends them.
   */
  reifyHistory(
    feed: Feed.Feed,
    messages: Message.Message[],
  ): Effect.Effect<Message.Message[], never, Feed.FeedService> {
    return Effect.gen(function* () {
      const links = yield* Feed.runQuery(feed, Filter.type(SessionLink));
      const sessionLinks = links.filter(Obj.instanceOf(SessionLink)).sort((a, b) => a.created.localeCompare(b.created));

      const link = sessionLinks[0];
      if (!link) {
        return messages;
      }

      const sourceFeed = link.feedRef.target;
      if (!sourceFeed) {
        return messages;
      }

      const sourceMessages = yield* Feed.runQuery(sourceFeed, Filter.type(Message.Message));
      const filtered = sourceMessages.filter(Obj.instanceOf(Message.Message));

      // Sort by creation timestamp so history is in chronological order.
      const sorted = [...filtered].sort((a, b) => a.created.localeCompare(b.created));

      // Include messages up to and including the fork point.
      const cutoffIndex = sorted.findIndex((m) => m.id === link.messageId);
      if (cutoffIndex < 0) {
        // Fork point not found; return original messages unmodified to avoid injecting unexpected history.
        return messages;
      }

      return [...sorted.slice(0, cutoffIndex + 1), ...messages];
    });
  }
}
