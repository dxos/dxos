//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

/** The canned reply's prefix, which a play test waits for. */
export const FAKE_REPLY = 'Fake assistant:';

/**
 * Stands in for the assistant's comment runner: appends a canned reply quoting the comment to the thread's feed, with
 * no model, so a story runs offline and deterministically.
 */
export const fakeCommentAgent: AppCapabilities.CommentAgentRunner = {
  run: ({ thread, message }) =>
    Effect.gen(function* () {
      const db = Obj.getDatabase(thread);
      if (!db) {
        return;
      }
      const feed = yield* Effect.promise(() => thread.feed.load());
      const text = message.blocks.flatMap((block) => (block._tag === 'text' ? [block.text] : [])).join(' ');
      yield* Effect.promise(() =>
        db.appendToFeed(feed, [
          Obj.make(Message.Message, {
            created: new Date().toISOString(),
            sender: { role: 'assistant' },
            blocks: [{ _tag: 'text', text: `${FAKE_REPLY} you said "${text}".` }],
          }),
        ]),
      );
    }),
};
