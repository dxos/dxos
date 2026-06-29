//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Feed, Filter } from '@dxos/echo';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import { InboxOperation } from '../../types';

const DEFAULT_CONCURRENCY = InboxOperation.DEFAULT_EXTRACT_MAILBOX_CONCURRENCY;

const handler: Operation.WithHandler<typeof InboxOperation.ExtractMailbox> = InboxOperation.ExtractMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox: mailboxRef, extractorId, concurrency = DEFAULT_CONCURRENCY }) {
      const mailbox = yield* Database.load(mailboxRef);
      const feed = yield* Database.load(mailbox.feed);
      const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;

      const stats = {
        succeeded: 0,
        failed: 0,
        created: 0,
        updated: 0,
      };

      yield* Effect.forEach(
        messages,
        (message) =>
          Operation.invoke(InboxOperation.ExtractMessage, { source: message, extractorId }).pipe(
            Effect.sandbox,
            Effect.retry({ times: 1 }),
            Effect.tap((result) =>
              Effect.sync(() => {
                stats.succeeded++;
                stats.created += result.created;
                stats.updated += result.updated;
              }),
            ),
            Effect.catchAllCause((cause) =>
              Effect.sync(() => {
                stats.failed++;
                log.warn('extract mailbox: message failed after retry', {
                  err: Cause.squash(cause),
                  messageId: message.id,
                  extractorId,
                  isDefect: !Cause.isFailure(cause),
                });
              }),
            ),
          ),
        { concurrency, discard: true },
      );

      return {
        extractorId,
        processed: messages.length,
        ...stats,
      };
    }),
  ),
);

export default handler;
