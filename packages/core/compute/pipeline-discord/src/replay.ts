//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { StateStore, type StateError, type Type } from '@dxos/crawler';

import { type StoreError } from './errors';
import { MessageStore, type StoredMessage } from './stores';

export type ReplayOptions = {
  /** Restrict the replay to these target (channel/thread) ids. */
  readonly targetIds?: readonly string[];
};

// The stored columns are the crawl-message fields; `raw` stays for future full-fidelity needs.
const toCrawlMessage = (stored: StoredMessage): Type.Message => ({
  id: stored.id,
  text: stored.text,
  author: {
    id: stored.authorId,
    source: 'discord',
    ...(stored.authorLabel ? { displayName: stored.authorLabel } : {}),
  },
  ...(stored.createdAt ? { createdAt: stored.createdAt } : {}),
  ...(stored.parentId ? { parentId: stored.parentId } : {}),
});

/**
 * Re-drive pipeline stages from the SQLite working set instead of a live Source: for every stored
 * target, emits Start → each stored message (chronological) → End. A stage assembly that is
 * idempotent over a live crawl behaves identically over a replay; there is no frontier/cursor —
 * a replay is a full pass, and stages rely on their own idempotency (fact hash cursors, upserts).
 */
export const replayStream = (
  options: ReplayOptions = {},
): Stream.Stream<Type.Event, StoreError | StateError, MessageStore | StateStore> =>
  Stream.unwrap(
    Effect.gen(function* () {
      const state = yield* StateStore;
      const messages = yield* MessageStore;
      const targets = (yield* state.listTargets()).filter(
        (target) => !options.targetIds || options.targetIds.includes(target.id),
      );
      return Stream.fromIterable(targets).pipe(
        Stream.flatMap((target) =>
          Stream.unwrap(
            messages.listByTarget(target.id).pipe(
              Effect.map((stored) => {
                const open: Type.Event = target.threadId
                  ? { _tag: 'ThreadStart', target, parentMessageId: target.parentMessageId }
                  : { _tag: 'ChannelStart', target };
                const close: Type.Event = target.threadId
                  ? { _tag: 'ThreadEnd', target }
                  : { _tag: 'ChannelEnd', target };
                const middle: Type.Event[] = stored.map((message) => ({
                  _tag: 'Message',
                  target,
                  message: toCrawlMessage(message),
                }));
                return Stream.fromIterable([open, ...middle, close]);
              }),
            ),
          ),
        ),
      );
    }),
  );
