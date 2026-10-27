//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

/** The canned reply, which a play test waits for. */
export const FAKE_REPLY = 'ok';

/** Long enough for the review plugin's pending message to be seen before the reply replaces it. */
const FAKE_LATENCY = '1500 millis';

/**
 * Stands in for the assistant's comment runner: after a short pause (the review plugin shows its pending message
 * meanwhile, as for the real agent) it appends a canned reply to the thread's feed, with no model, so a story runs
 * offline and deterministically.
 */
export const fakeCommentAgent: AppCapabilities.CommentAgentRunner = {
  run: ({ thread }) =>
    Effect.gen(function* () {
      const db = Obj.getDatabase(thread);
      if (!db) {
        return;
      }
      yield* Effect.sleep(FAKE_LATENCY);
      const feed = yield* Effect.promise(() => thread.feed.load());
      yield* Effect.promise(() =>
        db.appendToFeed(feed, [
          Obj.make(Message.Message, {
            created: new Date().toISOString(),
            sender: { role: 'assistant' },
            blocks: [{ _tag: 'text', text: FAKE_REPLY }],
          }),
        ]),
      );
    }),
};
