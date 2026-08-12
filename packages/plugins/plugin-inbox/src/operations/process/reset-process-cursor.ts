//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { log } from '@dxos/log';

import * as InboxOperation from '../../types/InboxOperation';
import { findFeedCursor } from './cursor';

/** Clears a pipeline cursor (the process pipeline's by default) so the next run re-processes the feed. */
const handler = InboxOperation.ResetProcessCursor.pipe(
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
      log.info('process: cursor reset', { mailbox: Obj.getURI(mailbox) });
      return { reset: true };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
