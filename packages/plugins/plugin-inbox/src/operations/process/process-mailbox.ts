//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { PROGRESS_STATUS_CANCELLED, PROGRESS_STATUS_COMPLETE } from '@dxos/app-toolkit';
import * as Cancellation from '@dxos/compute/Cancellation';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import { Message } from '@dxos/types';

import * as InboxOperation from '../../types/InboxOperation';
import { findOrCreateProcessCursor } from './cursor';

/** The message's display title for the log line and the progress meter. */
const messageTitle = (message: Message.Message): string =>
  typeof message.properties?.subject === 'string' ? message.properties.subject : message.id;

/**
 * Walking skeleton for a cursored pipeline over the mailbox feed: streams unprocessed messages
 * through a `log-title` stage (the seam where real stages plug in later), advancing the persisted
 * cursor per page so an interrupted run resumes from the last committed page. Emits sync-style
 * progress (`#process` key) and observes cancellation between messages.
 */
const handler = InboxOperation.ProcessMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox: mailboxRef, pageSize = InboxOperation.DEFAULT_PROCESS_MAILBOX_PAGE_SIZE }) {
      const mailbox = yield* Database.load(mailboxRef);
      const feed = yield* Database.load(mailbox.feed);
      const cursor = yield* findOrCreateProcessCursor(mailbox);

      // Fires on run cancellation (the toolbar stop / meter cancel terminates this process).
      const signal = yield* Cancellation.signal;

      // Live progress via trace `status.update` events, projected into the runtime ProgressRegistry
      // (same seam as mail sync); the current message title doubles as the meter's status text.
      const traceWriter = yield* Trace.TraceService;
      const progressKey = InboxOperation.createProcessProgressKey(mailbox);
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

      // NOTE(workaround): keyed on `message.created` epoch-ms because ECHO's native feed cursor is
      // unimplemented — same as `runFactPipeline` / the CRM pipeline. Strictly-greater skip so a rerun
      // never re-logs the boundary message (a message sharing the boundary's exact timestamp is
      // skipped too — acceptable for this skeleton, which has no precise dedup backstop).
      let cursorKey = Cursor.parseKey(cursor.max);
      const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
      const pending = messages
        .filter((message) => {
          const key = Date.parse(message.created);
          return Number.isFinite(key) && key > cursorKey;
        })
        .sort((left, right) => Date.parse(left.created) - Date.parse(right.created));

      log.info('process: pipeline start', {
        mailbox: Obj.getURI(mailbox),
        messages: messages.length,
        pending: pending.length,
        cursorKey,
      });
      reportStatus({ current: 0, total: pending.length });

      let processed = 0;
      const pipeline = Stream.fromIterable(pending).pipe(
        // The pipeline-body seam: real stages (facts/tag/summarize) replace or extend this later.
        Stage.map('log-title', (message: Message.Message) =>
          Effect.sync(() => {
            const title = messageTitle(message);
            log.info('process: message', { title, created: message.created });
            processed += 1;
            reportStatus({ current: processed, message: title });
            return message;
          }),
        ),
        Stream.grouped(pageSize),
        Pipeline.run({
          sink: (page) =>
            Effect.sync(() => {
              const keys = Chunk.toReadonlyArray(page).map((message) => Date.parse(message.created));
              if (keys.length === 0) {
                return;
              }
              // Advance per page so a cancelled/crashed run resumes from the last committed page.
              cursorKey = Math.max(cursorKey, ...keys);
              Cursor.advance(cursor, Cursor.formatKey(cursorKey));
            }),
        }),
        Pipeline.abortWith(
          signal,
          // `abortWith` interrupts, so nothing below the pipeline runs — the terminal status must be
          // emitted here or the meter's key stays suppressed for every later run.
          Effect.sync(() => {
            log.info('process: pipeline cancelled', { mailbox: Obj.getURI(mailbox), processed });
            reportStatus({ message: PROGRESS_STATUS_CANCELLED });
          }),
        ),
      );

      // A failed (not cancelled) run is recorded on the cursor before the error propagates, so the
      // durable state says why the last run stopped; `Cursor.advance` clears it on the next success.
      yield* pipeline.pipe(
        Effect.onError((cause) =>
          Effect.sync(() => {
            if (!Cause.isInterruptedOnly(cause)) {
              Cursor.recordError(cursor, Cause.pretty(cause).slice(0, 500));
            }
          }),
        ),
      );

      log.info('process: pipeline done', { mailbox: Obj.getURI(mailbox), processed });
      reportStatus({ message: PROGRESS_STATUS_COMPLETE });
      return { processed };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
