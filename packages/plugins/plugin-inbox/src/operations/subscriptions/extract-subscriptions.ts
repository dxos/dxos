//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { PROGRESS_STATUS_CANCELLED, PROGRESS_STATUS_COMPLETE, PROGRESS_STATUS_FAILED } from '@dxos/app-toolkit';
import * as Cancellation from '@dxos/compute/Cancellation';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import { Message } from '@dxos/types';

import * as InboxOperation from '../../types/InboxOperation';
import * as Mailbox from '../../types/Mailbox';

/**
 * Extracts unsubscribe affordances from every feed message — the `List-Unsubscribe` header the sync
 * mapper recorded, falling back to an unsubscribe-shaped body link — and replaces the mailbox's
 * `subscriptions` record with the per-sender aggregation. Mechanical (no LLM); idempotent by
 * construction (wholesale replace of derived state).
 */
const handler = InboxOperation.ExtractSubscriptions.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox: mailboxRef }) {
      const mailbox = yield* Database.load(mailboxRef);
      const feed = yield* Database.load(mailbox.feed);
      const { db } = yield* Database.Service;

      const signal = yield* Cancellation.signal;
      const traceWriter = yield* Trace.TraceService;
      const progressKey = InboxOperation.createSubscriptionsProgressKey(mailbox);
      let current = 0;
      let total: number | undefined;
      const reportStatus = (patch: { message?: string; current?: number; total?: number } = {}) => {
        current = patch.current ?? current;
        total = patch.total ?? total;
        traceWriter.write(Trace.StatusUpdate, {
          message: patch.message ?? mailbox.name ?? 'Mailbox',
          progress: { key: progressKey, current, total },
        });
      };

      const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
      log.info('subscriptions: pipeline start', { mailbox: Obj.getURI(mailbox), messages: messages.length });
      reportStatus({ current: 0, total: messages.length });

      let scanned = 0;
      let matched = 0;
      const carrying: Message.Message[] = [];
      const pipeline = Stream.fromIterable(messages).pipe(
        Stage.map('extract-unsubscribe', (message: Message.Message) =>
          Effect.sync(() => {
            scanned += 1;
            reportStatus({ current: scanned });
            const target = Mailbox.getUnsubscribeAffordance(message);
            if (target) {
              matched += 1;
            }
            return target ? message : undefined;
          }),
        ),
        Stream.grouped(50),
        Pipeline.run({
          sink: (page: Chunk.Chunk<Message.Message | undefined>) =>
            Effect.sync(() => {
              for (const message of Chunk.toReadonlyArray(page)) {
                if (message) {
                  carrying.push(message);
                }
              }
            }),
        }),
        Pipeline.abortWith(
          signal,
          Effect.sync(() => {
            log.info('subscriptions: pipeline cancelled', { mailbox: Obj.getURI(mailbox), scanned });
            reportStatus({ message: PROGRESS_STATUS_CANCELLED });
          }),
        ),
      );

      yield* pipeline.pipe(
        Effect.onError((cause) =>
          Effect.sync(() => {
            if (!Cause.isInterruptedOnly(cause)) {
              reportStatus({ message: PROGRESS_STATUS_FAILED });
            }
          }),
        ),
      );

      // Aggregate per sender and replace the mailbox record wholesale — reruns converge rather than
      // append, so the operation is idempotent without a cursor.
      const subscriptions = Mailbox.deriveSubscriptions(carrying, Mailbox.getUnsubscribeAffordance);
      Obj.update(mailbox, (mailbox) => {
        mailbox.subscriptions = subscriptions;
      });
      yield* Effect.promise(() => db.flush());

      log.info('subscriptions: pipeline done', {
        mailbox: Obj.getURI(mailbox),
        scanned,
        matched,
        subscriptions: subscriptions.length,
      });
      reportStatus({ message: PROGRESS_STATUS_COMPLETE });
      return { scanned, matched, subscriptions: subscriptions.length };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
