//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { PROGRESS_STATUS_CANCELLED, PROGRESS_STATUS_COMPLETE, PROGRESS_STATUS_FAILED } from '@dxos/app-toolkit';
import * as Cancellation from '@dxos/compute/Cancellation';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { type ContactGraph, buildContactGraph, getIdentityIndex } from '@dxos/extractor-lib';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import { Message } from '@dxos/types';

import { InboxOperation } from '#types';

import { deriveCorrespondents } from './correspondence.ts';

/**
 * Materializes the user's correspondents as Person objects: derives "anyone I have sent or replied
 * to" from the feed ({@link deriveCorrespondents}), then builds contacts through the shared
 * identity index so a rerun — or a concurrent extractor — never creates a duplicate. The outbound
 * signal satisfies the contact gate's allow-list, so no Organization match is required. Mechanical
 * (no LLM); no cursor — idempotency comes from the index, not from feed position.
 */
const handler = InboxOperation.ExtractCorrespondents.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox: mailboxRef, me }) {
      const mailbox = yield* Database.load(mailboxRef);
      const feed = yield* Database.load(mailbox.feed);
      const { db } = yield* Database.Service;

      const signal = yield* Cancellation.signal;
      const traceWriter = yield* Trace.TraceService;
      const progressKey = InboxOperation.createCorrespondentsProgressKey(mailbox);
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
      const correspondents = deriveCorrespondents(messages, me);
      log.info('correspondents: pipeline start', {
        mailbox: Obj.getURI(mailbox),
        messages: messages.length,
        correspondents: correspondents.length,
      });
      reportStatus({ current: 0, total: correspondents.length });

      // Refresh picks up contacts committed by other writers since the index was first built, and
      // passing the shared index into the builder registers each new contact for in-run dedup —
      // safe here (unlike an uncommitted overlay) because every contact is committed immediately.
      const index = yield* getIdentityIndex(db, { refresh: true });

      let scanned = 0;
      let created = 0;
      let organizations = 0;
      const pipeline = Stream.fromIterable(correspondents).pipe(
        Stage.map('build-contact', (correspondent) =>
          Effect.gen(function* () {
            scanned += 1;
            reportStatus({ current: scanned, message: correspondent.name ?? correspondent.email });
            return yield* buildContactGraph(
              { email: correspondent.email, name: correspondent.name },
              db,
              // The derivation already proved the outbound relationship; the automated flag keeps
              // deny-beats-allow for a correspondent only ever seen through list mail.
              { signals: { outbound: true, noReply: correspondent.automated }, index },
            );
          }),
        ),
        Pipeline.run({
          sink: (graph: ContactGraph) =>
            Effect.sync(() => {
              if (graph.organization) {
                db.add(graph.organization);
                organizations += 1;
              }
              if (graph.contact) {
                db.add(graph.contact);
                created += 1;
              }
            }),
        }),
        Pipeline.abortWith(
          signal,
          Effect.sync(() => {
            log.info('correspondents: pipeline cancelled', { mailbox: Obj.getURI(mailbox), scanned, created });
            reportStatus({ message: PROGRESS_STATUS_CANCELLED });
          }),
        ),
      );

      yield* pipeline.pipe(
        Effect.onError((cause) =>
          Effect.sync(() => {
            if (!Cause.hasInterruptsOnly(cause)) {
              reportStatus({ message: PROGRESS_STATUS_FAILED });
            }
          }),
        ),
      );

      yield* Effect.promise(() => db.flush());
      log.info('correspondents: pipeline done', { mailbox: Obj.getURI(mailbox), scanned, created, organizations });
      reportStatus({ message: PROGRESS_STATUS_COMPLETE });
      return { scanned: messages.length, correspondents: correspondents.length, created, organizations };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
