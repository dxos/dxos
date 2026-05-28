//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Feed, Filter, Obj } from '@dxos/echo';
import { type ContentBlock, Message } from '@dxos/types';

/**
 * Loads and reifies conversation history by resolving SessionLink content blocks.
 * Only the first content block of the first message is checked; all others are ignored.
 */
export class SessionLoader {
  /**
   * Replaces a leading SessionLink block with the messages it references.
   * If the first content block of the first message is a `sessionLink`, loads all messages
   * from the referenced feed up to and including `messageId` and prepends them to the history.
   */
  reifyHistory(messages: Message.Message[]): Effect.Effect<Message.Message[], never, Feed.FeedService> {
    return Effect.gen(function* () {
      const first = messages[0];
      if (!first || first.blocks.length === 0 || first.blocks[0]._tag !== 'sessionLink') {
        return messages;
      }

      const link = first.blocks[0] as ContentBlock.SessionLink;
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

      // Replace the SessionLink message with the loaded history.
      return [...sorted.slice(0, cutoffIndex + 1), ...messages.slice(1)];
    });
  }
}
