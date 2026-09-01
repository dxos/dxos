//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { log } from '@dxos/log';

import { InboxOperation } from '#types';

import { findFeedCursor } from './FeedCursor.ts';

/** Clears a consumer's feed cursor so its next run reprocesses the whole mailbox feed. */
const handler = InboxOperation.ResetFeedCursor.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox: mailboxRef, cursorId }) {
      const mailbox = yield* Database.load(mailboxRef);
      const cursor = yield* findFeedCursor(mailbox, cursorId);
      if (!cursor) {
        return { reset: false };
      }

      Obj.update(cursor, (cursor) => {
        cursor.max = undefined;
        cursor.min = undefined;
        cursor.lastTick = undefined;
        cursor.lastError = undefined;
      });
      log.info('cursor reset', { mailbox: Obj.getURI(mailbox), cursorId });
      return { reset: true };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
